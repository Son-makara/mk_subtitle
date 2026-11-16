import os
import re
import json
import uuid
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List

from ..config import UPLOADS_DIR, EXPORTS_DIR, AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH, BASE_DIR, SUBPROCESS_FLAGS
from ..models.subtitle import VideoBurnRequest
from .subtitle_parser import export_ass
from .audio_mixer import build_dubbed_audio_track
from .whisper_stt import resolve_media_file

def sanitize_filename(name: str) -> str:
    """Sanitizes filename for safe storage across Windows and Linux filesystems"""
    cleaned = re.sub(r'[<>:"/\\|?*]', '_', name)
    cleaned = re.sub(r'[\x00-\x1f]', '', cleaned)
    return cleaned.strip('. ') or "video"

def probe_video(file_path: Path) -> Dict[str, Any]:
    """Extracts duration, dimensions, fps, audio channels from video file"""
    try:
        cmd = [
            FFPROBE_PATH,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(file_path)
        ]
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=True,
            creationflags=SUBPROCESS_FLAGS
        )
        data = json.loads(result.stdout)
        
        duration = float(data.get("format", {}).get("duration", 0.0))
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)

        # Fallback duration from stream if format duration missing
        if duration <= 0.0:
            if video_stream and "duration" in video_stream:
                try:
                    duration = float(video_stream["duration"])
                except (ValueError, TypeError):
                    pass
            elif audio_stream and "duration" in audio_stream:
                try:
                    duration = float(audio_stream["duration"])
                except (ValueError, TypeError):
                    pass

        width = int(video_stream.get("width", 1920)) if video_stream else 1920
        height = int(video_stream.get("height", 1080)) if video_stream else 1080
        
        fps_val = 30.0
        if video_stream:
            r_fr = video_stream.get("r_frame_rate", "")
            if "/" in r_fr:
                num, den = r_fr.split("/")
                if float(den) > 0:
                    fps_val = round(float(num) / float(den), 2)
            elif r_fr:
                try:
                    fps_val = round(float(r_fr), 2)
                except ValueError:
                    pass

        return {
            "duration": round(duration, 3),
            "width": width,
            "height": height,
            "has_audio": audio_stream is not None,
            "codec": video_stream.get("codec_name", "unknown") if video_stream else "none",
            "fps": fps_val,
            "audio_sample_rate": int(audio_stream.get("sample_rate", 44100)) if audio_stream else 44100,
            "audio_channels": int(audio_stream.get("channels", 2)) if audio_stream else 2
        }
    except Exception as e:
        print(f"Probe video failed: {e}")
        return {"duration": 0.0, "width": 1920, "height": 1080, "has_audio": False}

# Global in-memory render progress tracker
RENDER_PROGRESS: Dict[str, Dict[str, Any]] = {}

def get_render_progress(job_id: str) -> Dict[str, Any]:
    """Returns real-time render progress for the given job_id"""
    return RENDER_PROGRESS.get(job_id, {"status": "pending", "progress": 0, "export_filename": None})

def render_and_burn_video(req: VideoBurnRequest) -> str:
    """
    Renders video with burned-in subtitles and optional dubbed audio track and background music.
    Utilizes AMD AMF GPU encoding (h264_amf) with automatic, seamless CPU fallback (libx264).
    Tracks real-time progress percentage (0-100%) and preserves the original episode filename.
    """
    if req.job_id:
        RENDER_PROGRESS[req.job_id] = {
            "status": "rendering",
            "progress": 0,
            "export_filename": None,
            "error": None
        }

    video_path = resolve_media_file(req.video_filename)
    probe = probe_video(video_path)

    # Calculate video duration safely
    max_sub_time = max((it.end_time for it in req.items), default=5.0) if req.items else 5.0
    total_dur = probe.get("duration", 0.0)
    if total_dur <= 0.05:
        total_dur = max_sub_time

    temp_id = uuid.uuid4().hex[:8]
    temp_ass_path = AUDIO_CACHE_DIR / f"temp_{temp_id}.ass"

    # 1. Generate temp ASS file if subtitles present
    sub_mode = getattr(req, "subtitle_mode", "khmer")
    burn_subs = getattr(req, "burn_subtitles", True) and sub_mode != "none"
    has_subtitles = bool(req.items) and burn_subs
    if has_subtitles:
        pos = getattr(req, "subtitle_position", "bottom")
        align = 8 if pos == "top" else (5 if pos == "middle" else 2)
        v_offset = getattr(req, "vertical_offset", 55)
        use_translated_flag = (sub_mode == "khmer")
        ass_content = export_ass(
            items=req.items,
            use_translated=use_translated_flag,
            style_preset=req.subtitle_style,
            font_name=req.font_name,
            font_size=req.font_size,
            primary_color=req.primary_color,
            outline_color=req.outline_color,
            alignment=align,
            margin_v=v_offset,
            play_res_x=probe.get("width", 1920),
            play_res_y=probe.get("height", 1080)
        )
        with open(temp_ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

    # Derive clean output filename preserving original episode name
    source_name = req.custom_output_filename or req.video_filename
    original_stem = sanitize_filename(Path(source_name).stem)
    if original_stem.startswith("mk_sub_"):
        original_stem = original_stem.replace("mk_sub_", "")

    target_export_filename = f"{original_stem}_dubbed.mp4"
    export_path = EXPORTS_DIR / target_export_filename

    # Ensure writable or use fallback with unique id if locked by another application
    try:
        if export_path.exists():
            export_path.unlink(missing_ok=True)
        export_filename = target_export_filename
    except Exception:
        export_filename = f"{original_stem}_dubbed_{temp_id}.mp4"
        export_path = EXPORTS_DIR / export_filename

    # Format path for FFmpeg subtitles filter on Windows (escaped colons and backslashes)
    ass_filter_path = str(temp_ass_path).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    vf_subtitles = f"subtitles='{ass_filter_path}'"

    # 2. Check if dubbing audio is requested
    dubbed_audio_path = None
    if req.include_dubbing and req.items:
        has_dubbing_items = any(it.audio_url for it in req.items)
        if has_dubbing_items:
            dubbed_audio_path = build_dubbed_audio_track(req.items, total_dur)

    # 3. Check BGM path
    bgm_path = None
    if req.bgm_filename:
        for possible in [AUDIO_CACHE_DIR / req.bgm_filename, UPLOADS_DIR / req.bgm_filename]:
            if possible.exists():
                bgm_path = str(possible)
                break

    # 4. Check Watermark Logo
    logo_path = None
    if req.add_logo_watermark:
        if getattr(req, "watermark_custom_path", None):
            raw_c = Path(str(req.watermark_custom_path).replace("/api/video/", "").replace("/api/assets/", "").split("?")[0])
            for d in [UPLOADS_DIR, BASE_DIR / "assets", BASE_DIR]:
                p = d / raw_c.name
                if p.exists() and p.is_file():
                    logo_path = p
                    break
            if not logo_path and raw_c.exists() and raw_c.is_file():
                logo_path = raw_c

        if not logo_path:
            default_p = BASE_DIR / "assets" / "logo.png"
            if default_p.exists():
                logo_path = default_p

    has_watermark = (logo_path is not None and logo_path.exists())

    # Build input list and track stream indexes accurately
    cmd_inputs = ["-i", str(video_path)]
    in_idx_counter = 0

    video_in = in_idx_counter  # 0

    logo_in = None
    if has_watermark:
        in_idx_counter += 1
        logo_in = in_idx_counter
        cmd_inputs.extend(["-i", str(logo_path)])

    dubbed_in = None
    if dubbed_audio_path:
        in_idx_counter += 1
        dubbed_in = in_idx_counter
        cmd_inputs.extend(["-i", str(dubbed_audio_path)])

    bgm_in = None
    if bgm_path:
        in_idx_counter += 1
        bgm_in = in_idx_counter
        cmd_inputs.extend(["-stream_loop", "-1", "-i", str(bgm_path)])

    # Construct Filter Complex
    filter_chains = []

    # --- Video chain ---
    current_v = f"[{video_in}:v]"

    # 1. Anti-Copyright Shield transforms
    if getattr(req, "enable_anti_copyright", False):
        ac_filters = []
        if getattr(req, "anti_copyright_flip", True):
            ac_filters.append("hflip")
        z = max(1.01, min(getattr(req, "anti_copyright_zoom", 1.03) or 1.03, 1.15))
        ac_filters.append(f"scale=iw*{z:.3f}:ih*{z:.3f},crop=iw/{z:.3f}:ih/{z:.3f}")
        if getattr(req, "anti_copyright_color", True):
            ac_filters.append("eq=contrast=1.03:brightness=0.01:saturation=1.04")
        spd = max(0.95, min(getattr(req, "anti_copyright_speed", 1.03) or 1.03, 1.25))
        if abs(spd - 1.0) > 0.005:
            ac_filters.append(f"setpts=PTS/{spd:.3f}")
        if ac_filters:
            filter_chains.append(f"{current_v}{','.join(ac_filters)}[vac]")
            current_v = "[vac]"

    # 2. Delogo / Cover old foreign subtitles or logos
    if getattr(req, "enable_delogo", False):
        mode = getattr(req, "delogo_mode", "blur") or "blur"
        area = getattr(req, "delogo_area", "bottom_subtitles") or "bottom_subtitles"
        h_pct = max(0.08, min(getattr(req, "delogo_height_pct", 0.14) or 0.14, 0.35))
        if area == "bottom_subtitles":
            if mode == "black_bar":
                filter_chains.append(f"{current_v}drawbox=x=0:y=ih*{1.0 - h_pct:.3f}:w=iw:h=ih*{h_pct:.3f}:color=black@0.85:t=fill[vdelogo]")
            else:
                filter_chains.append(f"{current_v}split[vbase][vcrop];[vcrop]crop=iw:ih*{h_pct:.3f}:0:ih*{1.0 - h_pct:.3f},boxblur=12:6[vblur];[vbase][vblur]overlay=0:H*{1.0 - h_pct:.3f}[vdelogo]")
            current_v = "[vdelogo]"
        elif area == "top_right":
            filter_chains.append(f"{current_v}split[vbase][vcrop];[vcrop]crop=iw*0.22:ih*0.12:iw*0.78:0,boxblur=10:5[vblur];[vbase][vblur]overlay=W*0.78:0[vdelogo]")
            current_v = "[vdelogo]"
        elif area == "top_left":
            filter_chains.append(f"{current_v}split[vbase][vcrop];[vcrop]crop=iw*0.22:ih*0.12:0:0,boxblur=10:5[vblur];[vbase][vblur]overlay=0:0[vdelogo]")
            current_v = "[vdelogo]"

    # 3. Subtitles Burn
    if has_subtitles and temp_ass_path.exists():
        filter_chains.append(f"{current_v}{vf_subtitles}[vsub]")
        current_v = "[vsub]"

    # 4. Watermark Logo
    if logo_in is not None:
        wm_size = max(30, min(getattr(req, "watermark_size", 90) or 90, 500))
        wm_opacity = max(0.1, min(getattr(req, "watermark_opacity", 0.85) or 0.85, 1.0))
        wm_margin = max(0, min(getattr(req, "watermark_margin", 20) or 20, 200))
        wm_pos = getattr(req, "watermark_position", "top_right") or "top_right"

        # Map position to FFmpeg overlay coordinate formula
        if wm_pos == "top_left":
            overlay_coord = f"{wm_margin}:{wm_margin}"
        elif wm_pos == "bottom_right":
            overlay_coord = f"W-w-{wm_margin}:H-h-{wm_margin}"
        elif wm_pos == "bottom_left":
            overlay_coord = f"{wm_margin}:H-h-{wm_margin}"
        elif wm_pos == "center":
            overlay_coord = f"(W-w)/2:(H-h)/2"
        else:  # top_right (default)
            overlay_coord = f"W-w-{wm_margin}:{wm_margin}"

        # Scale and adjust opacity using colorchannelmixer
        if wm_opacity < 0.99:
            filter_chains.append(f"[{logo_in}:v]scale={wm_size}:-1,format=rgba,colorchannelmixer=aa={wm_opacity:.2f}[logo]")
        else:
            filter_chains.append(f"[{logo_in}:v]scale={wm_size}:-1[logo]")

        filter_chains.append(f"{current_v}[logo]overlay={overlay_coord}[vout]")
    else:
        filter_chains.append(f"{current_v}null[vout]")

    # --- Audio chain ---
    has_orig_audio = probe.get("has_audio", False)
    has_dubbed_voice = (dubbed_in is not None)

    # When dubbed voice is present, original audio can be ducked or muted.
    # When NO Khmer dubbed voice is present, original video audio/music is ALWAYS preserved (not muted).
    keep_original_audio = (
        has_orig_audio
        and (
            (not req.mute_original_audio and req.background_ducking_volume > 0.01)
            if has_dubbed_voice
            else True
        )
    )

    audio_mapping = None

    duck_level = max(0.05, min(req.background_ducking_volume, 0.95))
    duck_ratio = round(max(2.0, min(16.0, 1.0 / duck_level)), 1)
    attack_ms = max(10, getattr(req, "ducking_attack", 40) or 40)
    release_ms = max(50, getattr(req, "ducking_release", 350) or 350)
    use_smart_ducking = getattr(req, "smart_ducking", True)

    # BGM Fader filter
    bgm_fade_in = getattr(req, "bgm_fade_in", 2.0) or 2.0
    bgm_fade_out = getattr(req, "bgm_fade_out", 3.0) or 3.0
    bgm_use_fade = getattr(req, "bgm_crossfade", True) and total_dur > 5.0
    if bgm_in is not None:
        if bgm_use_fade:
            fade_out_st = max(0.0, total_dur - bgm_fade_out)
            bgm_filt_str = f"[{bgm_in}:a]volume={req.bgm_volume},afade=t=in:ss=0:d={bgm_fade_in:.1f},afade=t=out:st={fade_out_st:.2f}:d={bgm_fade_out:.1f}[bgmv]"
        else:
            bgm_filt_str = f"[{bgm_in}:a]volume={req.bgm_volume}[bgmv]"
        filter_chains.append(bgm_filt_str)

    # Audio anti-copyright speed filter
    orig_a_in = f"[{video_in}:a]"
    dubbed_a_in = f"[{dubbed_in}:a]" if dubbed_in is not None else None
    if getattr(req, "enable_anti_copyright", False):
        spd = max(0.95, min(getattr(req, "anti_copyright_speed", 1.03) or 1.03, 1.25))
        if abs(spd - 1.0) > 0.005:
            if has_orig_audio:
                filter_chains.append(f"[{video_in}:a]atempo={spd:.3f}[orig_spd]")
                orig_a_in = "[orig_spd]"
            if dubbed_in is not None:
                filter_chains.append(f"[{dubbed_in}:a]atempo={spd:.3f}[dubbed_spd]")
                dubbed_a_in = "[dubbed_spd]"

    if dubbed_in is not None and bgm_in is not None:
        if keep_original_audio:
            if use_smart_ducking:
                filter_chains.append(
                    f"{orig_a_in}volume=1.0[orig_bg];"
                    f"[orig_bg][bgmv]amix=inputs=2:normalize=0[bg_all];"
                    f"[bg_all]{dubbed_a_in}sidechaincompress=threshold=0.03:ratio={duck_ratio}:attack={attack_ms}:release={release_ms}[ducked_bg];"
                    f"[ducked_bg]{dubbed_a_in}amix=inputs=2:duration=first:normalize=0[aout]"
                )
            else:
                filter_chains.append(
                    f"{orig_a_in}volume={req.background_ducking_volume}[ducked];"
                    f"[ducked]{dubbed_a_in}[bgmv]amix=inputs=3:duration=first[aout]"
                )
        else:
            if use_smart_ducking:
                filter_chains.append(
                    f"[bgmv]{dubbed_a_in}sidechaincompress=threshold=0.03:ratio={duck_ratio}:attack={attack_ms}:release={release_ms}[ducked_bg];"
                    f"[ducked_bg]{dubbed_a_in}amix=inputs=2:duration=first:normalize=0[aout]"
                )
            else:
                filter_chains.append(
                    f"[{dubbed_in}:a][bgmv]amix=inputs=2:duration=first[aout]"
                )
        audio_mapping = "[aout]"

    elif dubbed_in is not None and bgm_in is None:
        if keep_original_audio:
            if use_smart_ducking:
                filter_chains.append(
                    f"{orig_a_in}{dubbed_a_in}sidechaincompress=threshold=0.03:ratio={duck_ratio}:attack={attack_ms}:release={release_ms}[ducked_orig];"
                    f"[ducked_orig]{dubbed_a_in}amix=inputs=2:duration=first:normalize=0[aout]"
                )
            else:
                filter_chains.append(
                    f"{orig_a_in}volume={req.background_ducking_volume}[ducked];"
                    f"[ducked]{dubbed_a_in}amix=inputs=2:duration=first[aout]"
                )
            audio_mapping = "[aout]"
        else:
            filter_chains.append(
                f"{dubbed_a_in}aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]"
            )
            audio_mapping = "[aout]"

    elif dubbed_in is None and bgm_in is not None:
        if has_orig_audio:
            filter_chains.append(
                f"{orig_a_in}volume=1.0[orig];"
                f"[orig][bgmv]amix=inputs=2:duration=first[aout]"
            )
            audio_mapping = "[aout]"
        else:
            filter_chains.append(
                f"[bgmv]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]"
            )
            audio_mapping = "[aout]"

    else:
        # Neither dubbing nor BGM: Preserve original audio and music (never mute if original audio exists)
        if has_orig_audio:
            if getattr(req, "enable_anti_copyright", False) and abs(getattr(req, "anti_copyright_speed", 1.03) - 1.0) > 0.005:
                audio_mapping = "[orig_spd]"
            else:
                audio_mapping = f"{video_in}:a?"
        else:
            audio_mapping = "-an"

    # Assemble complete ffmpeg command
    base_cmd = [FFMPEG_PATH, "-y", "-progress", "pipe:1", *cmd_inputs]
    full_filter_str = ";".join(filter_chains)
    base_cmd.extend(["-filter_complex", full_filter_str])
    base_cmd.extend(["-map", "[vout]"])

    if audio_mapping == "-an":
        base_cmd.append("-an")
    elif audio_mapping == "[aout]":
        base_cmd.extend(["-map", "[aout]"])
    else:
        base_cmd.extend(["-map", audio_mapping])

    # End at video duration when looping BGM
    if bgm_in is not None:
        base_cmd.append("-shortest")

    def get_encode_flags(use_amf: bool) -> List[str]:
        if use_amf:
            return [
                "-c:v", "h264_amf",
                "-quality", "speed",
                "-rc", "cbr",
                "-b:v", "6M",
                "-pix_fmt", "yuv420p",
                "-threads", "0",
                "-c:a", "aac",
                "-b:a", "192k"
            ]
        else:
            return [
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
                "-threads", "0",
                "-c:a", "aac",
                "-b:a", "192k"
            ]

    def execute_ffmpeg_process(full_command: List[str]) -> tuple:
        proc = subprocess.Popen(
            full_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=SUBPROCESS_FLAGS
        )
        stderr_buffer = []

        def capture_stderr():
            for line in proc.stderr:
                stderr_buffer.append(line)

        t_err = threading.Thread(target=capture_stderr, daemon=True)
        t_err.start()

        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            if line.startswith("out_time_us="):
                try:
                    out_us = int(line.split("=")[1])
                    if total_dur > 0:
                        pct = int((out_us / (total_dur * 1_000_000)) * 100)
                        pct = max(0, min(99, pct))
                        if req.job_id:
                            RENDER_PROGRESS[req.job_id]["progress"] = pct
                except Exception:
                    pass
            elif line == "progress=end":
                if req.job_id:
                    RENDER_PROGRESS[req.job_id]["progress"] = 99

        proc.wait()
        t_err.join(timeout=3.0)
        return proc.returncode, "".join(stderr_buffer)

    # Run FFmpeg render
    try:
        if req.use_amf_gpu:
            full_cmd = [*base_cmd, *get_encode_flags(True), str(export_path)]
            rc, err_out = execute_ffmpeg_process(full_cmd)
            if rc != 0:
                print(f"AMF render returned non-zero code ({rc}), attempting automatic fallback to libx264...")
                fallback_cmd = [*base_cmd, *get_encode_flags(False), str(export_path)]
                rc_fb, err_fb = execute_ffmpeg_process(fallback_cmd)
                if rc_fb != 0:
                    if req.job_id:
                        RENDER_PROGRESS[req.job_id]["status"] = "failed"
                        RENDER_PROGRESS[req.job_id]["error"] = err_fb[-400:]
                    raise RuntimeError(f"FFmpeg CPU fallback render failed: {err_fb[-600:]}")
        else:
            full_cmd = [*base_cmd, *get_encode_flags(False), str(export_path)]
            rc, err_out = execute_ffmpeg_process(full_cmd)
            if rc != 0:
                if req.job_id:
                    RENDER_PROGRESS[req.job_id]["status"] = "failed"
                    RENDER_PROGRESS[req.job_id]["error"] = err_out[-400:]
                raise RuntimeError(f"FFmpeg render failed: {err_out[-600:]}")

        if req.job_id:
            RENDER_PROGRESS[req.job_id]["progress"] = 100
            RENDER_PROGRESS[req.job_id]["status"] = "completed"
            RENDER_PROGRESS[req.job_id]["export_filename"] = export_filename

    finally:
        # Clean up temp ASS file
        if temp_ass_path.exists():
            try:
                os.remove(temp_ass_path)
            except Exception:
                pass

    return export_filename

def concat_videos(
    video_filenames: List[str],
    custom_output_filename: Optional[str] = None,
    job_id: Optional[str] = None
) -> str:
    """
    Concatenates multiple video files into a single master video file.
    Uses fast stream copy (-c copy with concat demuxer) when codecs match,
    with an automatic fallback to filter_complex re-encoding.
    """
    if not video_filenames:
        raise ValueError("No video filenames provided for concatenation.")

    if job_id:
        RENDER_PROGRESS[job_id] = {
            "progress": 5,
            "status": "rendering",
            "message": f"Preparing to combine {len(video_filenames)} videos..."
        }

    resolved_paths: List[Path] = []
    for fn in video_filenames:
        found = None
        # 1. Direct path check (local disk or network share)
        raw_path = Path(str(fn).split("?")[0])
        if raw_path.is_file() and raw_path.exists():
            found = raw_path

        if not found:
            clean = Path(str(fn).replace("/api/exports/", "").replace("/api/video/", "").split("?")[0]).name
            for d in [EXPORTS_DIR, UPLOADS_DIR]:
                p = d / clean
                if p.exists() and p.is_file():
                    found = p
                    break
            if not found:
                # Try stem matching
                stem = Path(clean).stem.lower()
                for d in [EXPORTS_DIR, UPLOADS_DIR]:
                    for f in d.glob("*"):
                        if f.is_file() and not f.name.startswith(".gitkeep") and f.stem.lower() == stem:
                            found = f
                            break
                    if found:
                        break
        if not found:
            raise FileNotFoundError(f"Video file '{fn}' not found in exports, uploads, or local disk.")
        resolved_paths.append(found)

    # Determine output filename
    if custom_output_filename:
        out_name = sanitize_filename(Path(custom_output_filename).name)
        if not out_name.lower().endswith(".mp4"):
            out_name = f"{out_name}.mp4"
    else:
        first_stem = sanitize_filename(resolved_paths[0].stem.replace("_dubbed", "").replace("mk_sub_", ""))
        out_name = f"{first_stem}_combined_full_movie.mp4"

    export_path = EXPORTS_DIR / out_name
    try:
        if export_path.exists():
            export_path.unlink(missing_ok=True)
    except Exception:
        out_name = f"{Path(out_name).stem}_{uuid.uuid4().hex[:6]}.mp4"
        export_path = EXPORTS_DIR / out_name

    temp_list_path = AUDIO_CACHE_DIR / f"concat_{uuid.uuid4().hex[:8]}.txt"
    try:
        # Write concat list with safe paths
        with open(temp_list_path, "w", encoding="utf-8") as f:
            for vp in resolved_paths:
                safe_path = str(vp.resolve()).replace("\\", "/").replace("'", "'\\''")
                f.write(f"file '{safe_path}'\n")

        if job_id:
            RENDER_PROGRESS[job_id]["progress"] = 30
            RENDER_PROGRESS[job_id]["message"] = "Stitching video segments together..."

        # 1. Attempt fast lossless stream copy
        copy_cmd = [
            FFMPEG_PATH, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(temp_list_path),
            "-c", "copy",
            str(export_path)
        ]
        proc = subprocess.run(
            copy_cmd,
            capture_output=True,
            text=True,
            creationflags=SUBPROCESS_FLAGS
        )

        stream_copy_success = proc.returncode == 0 and export_path.exists() and export_path.stat().st_size > 1000

        # 2. Fallback to re-encode concat if stream copy is not feasible
        if not stream_copy_success:
            if job_id:
                RENDER_PROGRESS[job_id]["progress"] = 50
                RENDER_PROGRESS[job_id]["message"] = "Stream copy mismatch; re-encoding to seamless master MP4..."

            # First try re-encoding with concat demuxer (supports any number of files cleanly on Windows)
            reencode_cmd = [
                FFMPEG_PATH, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(temp_list_path),
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                str(export_path)
            ]
            rc2 = subprocess.run(
                reencode_cmd,
                capture_output=True,
                text=True,
                creationflags=SUBPROCESS_FLAGS
            )
            if rc2.returncode != 0 or not export_path.exists() or export_path.stat().st_size < 1000:
                # If concat demuxer re-encode fails and list is small, try filter_complex
                if len(resolved_paths) <= 30:
                    inputs = []
                    filter_segments = []
                    for i, vp in enumerate(resolved_paths):
                        inputs.extend(["-i", str(vp)])
                        filter_segments.append(f"[{i}:v][{i}:a]")

                    filter_str = f"{''.join(filter_segments)}concat=n={len(resolved_paths)}:v=1:a=1[v][a]"
                    fc_cmd = [
                        FFMPEG_PATH, "-y",
                        *inputs,
                        "-filter_complex", filter_str,
                        "-map", "[v]",
                        "-map", "[a]",
                        "-c:v", "libx264",
                        "-preset", "veryfast",
                        "-crf", "22",
                        "-pix_fmt", "yuv420p",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        str(export_path)
                    ]
                    rc3 = subprocess.run(fc_cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
                    if rc3.returncode != 0 or not export_path.exists() or export_path.stat().st_size < 1000:
                        raise RuntimeError(f"Video concatenation failed: {rc3.stderr[-400:]}")
                else:
                    raise RuntimeError(f"Video concatenation failed: {rc2.stderr[-400:]}")

        if job_id:
            RENDER_PROGRESS[job_id]["progress"] = 100
            RENDER_PROGRESS[job_id]["status"] = "completed"
            RENDER_PROGRESS[job_id]["export_filename"] = out_name

        return out_name

    finally:
        if temp_list_path.exists():
            try:
                os.remove(temp_list_path)
            except Exception:
                pass
