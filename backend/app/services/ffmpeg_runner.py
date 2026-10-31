import os
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
    has_subtitles = bool(req.items)
    if has_subtitles:
        ass_content = export_ass(
            items=req.items,
            use_translated=req.use_translation,
            style_preset=req.subtitle_style,
            font_name=req.font_name,
            font_size=req.font_size,
            primary_color=req.primary_color,
            outline_color=req.outline_color,
            play_res_x=probe.get("width", 1920),
            play_res_y=probe.get("height", 1080)
        )
        with open(temp_ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

    # Derive clean output filename preserving original episode name
    source_name = req.custom_output_filename or req.video_filename
    original_stem = Path(source_name).stem
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
    logo_path = BASE_DIR / "assets" / "logo.png"
    has_watermark = req.add_logo_watermark and logo_path.exists()

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
    if has_subtitles and temp_ass_path.exists():
        filter_chains.append(f"[{video_in}:v]{vf_subtitles}[vsub]")
        current_v = "[vsub]"
    else:
        current_v = f"[{video_in}:v]"

    if logo_in is not None:
        filter_chains.append(f"[{logo_in}:v]scale=90:-1[logo]")
        filter_chains.append(f"{current_v}[logo]overlay=W-w-20:20[vout]")
    else:
        filter_chains.append(f"{current_v}null[vout]")

    # --- Audio chain ---
    has_orig_audio = probe.get("has_audio", False)
    keep_original_audio = (
        not req.mute_original_audio
        and has_orig_audio
        and req.background_ducking_volume > 0.01
    )

    audio_mapping = None

    if dubbed_in is not None and bgm_in is not None:
        if keep_original_audio:
            filter_chains.append(
                f"[{video_in}:a]volume={req.background_ducking_volume}[ducked];"
                f"[{bgm_in}:a]volume={req.bgm_volume}[bgmv];"
                f"[ducked][{dubbed_in}:a][bgmv]amix=inputs=3:duration=first[aout]"
            )
        else:
            filter_chains.append(
                f"[{bgm_in}:a]volume={req.bgm_volume}[bgmv];"
                f"[{dubbed_in}:a][bgmv]amix=inputs=2:duration=first[aout]"
            )
        audio_mapping = "[aout]"

    elif dubbed_in is not None and bgm_in is None:
        if keep_original_audio:
            filter_chains.append(
                f"[{video_in}:a]volume={req.background_ducking_volume}[ducked];"
                f"[ducked][{dubbed_in}:a]amix=inputs=2:duration=first[aout]"
            )
            audio_mapping = "[aout]"
        else:
            filter_chains.append(
                f"[{dubbed_in}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]"
            )
            audio_mapping = "[aout]"

    elif dubbed_in is None and bgm_in is not None:
        if keep_original_audio:
            filter_chains.append(
                f"[{video_in}:a]volume={req.background_ducking_volume}[orig];"
                f"[{bgm_in}:a]volume={req.bgm_volume}[bgmv];"
                f"[orig][bgmv]amix=inputs=2:duration=first[aout]"
            )
            audio_mapping = "[aout]"
        else:
            filter_chains.append(
                f"[{bgm_in}:a]volume={req.bgm_volume}[aout]"
            )
            audio_mapping = "[aout]"

    else:
        # Neither dubbing nor BGM
        if req.mute_original_audio or not has_orig_audio:
            audio_mapping = "-an"
        else:
            audio_mapping = f"{video_in}:a?"

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
