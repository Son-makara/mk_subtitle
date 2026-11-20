import os
import re
import json
import uuid
import logging
import urllib.parse
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

from ..config import STORAGE_DIR, UPLOADS_DIR, EXPORTS_DIR, AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH, BASE_DIR, SUBPROCESS_FLAGS
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

    video_path = None
    if getattr(req, "video_file_path", None):
        p = Path(req.video_file_path)
        if p.is_file() and p.exists() and p.suffix.lower() in {".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".m4v", ".ts"}:
            video_path = p

    if not video_path:
        video_path = resolve_media_file(req.video_filename, require_video=True)

    probe = probe_video(video_path)
    if not probe.get("width") or probe.get("codec") == "none":
        raise ValueError(f"Resolved file '{video_path.name}' is not a valid video file or has no video stream.")

    # Calculate video duration safely
    max_sub_time = max((it.end_time for it in req.items), default=5.0) if req.items else 5.0
    total_dur = probe.get("duration", 0.0)
    if total_dur <= 0.05:
        total_dur = max_sub_time

    # Derive clean output filename preserving original episode name
    source_name = req.custom_output_filename or req.video_filename
    original_stem = sanitize_filename(Path(source_name).stem)
    if original_stem.startswith("mk_sub_"):
        original_stem = original_stem.replace("mk_sub_", "")

    temp_id = uuid.uuid4().hex[:8]
    temp_ass_path = AUDIO_CACHE_DIR / f"temp_{temp_id}.ass"

    # 1. Generate temp ASS file if subtitles present or Episode Badge / Text Watermark enabled
    sub_mode = getattr(req, "subtitle_mode", "khmer")
    burn_subs = getattr(req, "burn_subtitles", True) and sub_mode != "none"
    has_episode_badge = bool(getattr(req, "enable_episode_badge", False))
    has_text_watermark = bool(getattr(req, "enable_text_watermark", False) and getattr(req, "text_watermark_text", None))
    has_subtitles = (bool(req.items) and burn_subs) or has_episode_badge or has_text_watermark

    badge_text = getattr(req, "episode_badge_text", None)
    if has_episode_badge:
        if not badge_text:
            ep_start = getattr(req, "episode_badge_start", 1) or 1
            ep_total = getattr(req, "episode_badge_total", None)
            template = getattr(req, "episode_badge_template", None) or "ភាគទី {ep}"
            badge_text = template.replace("{ep}", str(ep_start)).replace("{ep_pad}", f"{ep_start:02d}").replace("{title}", original_stem)
            if ep_total:
                badge_text = badge_text.replace("{total}", str(ep_total))
            else:
                badge_text = badge_text.replace("{total}", "")

    if has_subtitles:
        pos = getattr(req, "subtitle_position", "bottom")
        align = 8 if pos == "top" else (5 if pos == "middle" else 2)
        v_offset = getattr(req, "vertical_offset", 55)
        use_translated_flag = (sub_mode == "khmer")
        ass_content = export_ass(
            items=req.items if burn_subs else [],
            use_translated=use_translated_flag,
            style_preset=req.subtitle_style,
            font_name=req.font_name,
            font_size=req.font_size,
            primary_color=req.primary_color,
            outline_color=req.outline_color,
            alignment=align,
            margin_v=v_offset,
            play_res_x=probe.get("width", 1920),
            play_res_y=probe.get("height", 1080),
            enable_episode_badge=has_episode_badge,
            episode_badge_text=badge_text,
            episode_badge_position=getattr(req, "episode_badge_position", "top_left") or "top_left",
            episode_badge_style=getattr(req, "episode_badge_style", "glass_pill") or "glass_pill",
            episode_badge_font_size=getattr(req, "episode_badge_font_size", 22) or 22,
            episode_badge_duration=getattr(req, "episode_badge_duration", "always") or "always",
            enable_text_watermark=has_text_watermark,
            text_watermark_text=getattr(req, "text_watermark_text", None),
            text_watermark_position=getattr(req, "text_watermark_position", "top_right") or "top_right",
            text_watermark_style=getattr(req, "text_watermark_style", "shadow") or "shadow",
            text_watermark_font_size=getattr(req, "text_watermark_font_size", 18) or 18,
            text_watermark_opacity=getattr(req, "text_watermark_opacity", 0.8) if getattr(req, "text_watermark_opacity", None) is not None else 0.8,
            text_watermark_color=getattr(req, "text_watermark_color", "&H00FFFFFF") or "&H00FFFFFF",
            watermark_auto_move=bool(getattr(req, "watermark_auto_move", False)),
            watermark_move_interval=int(getattr(req, "watermark_move_interval", 30) or 30),
            watermark_move_mode=getattr(req, "watermark_move_mode", "corner_rotate") or "corner_rotate",
            video_duration=total_dur
        )
        with open(temp_ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)

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

    # 0. Dedicated Video Mirror & Screen Flip Transform
    mirror_h = getattr(req, "mirror_horizontal", False)
    flip_v = getattr(req, "flip_vertical", False)
    rot_angle = getattr(req, "rotate_angle", 0) or 0
    orient_filters = []
    if mirror_h:
        orient_filters.append("hflip")
    if flip_v:
        orient_filters.append("vflip")
    if rot_angle == 90:
        orient_filters.append("transpose=1")
    elif rot_angle == 180:
        orient_filters.append("hflip,vflip")
    elif rot_angle == 270:
        orient_filters.append("transpose=2")
    if orient_filters:
        filter_chains.append(f"{current_v}{','.join(orient_filters)}[vorient]")
        current_v = "[vorient]"

    # 1. Anti-Copyright Shield transforms
    if getattr(req, "enable_anti_copyright", False):
        ac_filters = []
        if getattr(req, "anti_copyright_flip", True) and not mirror_h:
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

    # 2. Shape Blur & Delogo / Cover old foreign subtitles, watermarks or logos
    if getattr(req, "enable_delogo", False):
        mode = getattr(req, "delogo_mode", "blur") or "blur"
        area = getattr(req, "delogo_area", "bottom_subtitles") or "bottom_subtitles"

        raw_h = getattr(req, "delogo_height_pct", 0.14) or 0.14
        h_pct = max(0.03, min(float(raw_h), 1.0))

        if area == "bottom_subtitles":
            h_pct = max(0.06, min(h_pct, 0.40))
            x_pct = 0.0
            y_pct = 1.0 - h_pct
            w_pct = 1.0
        elif area == "top_banner":
            h_pct = max(0.06, min(h_pct, 0.40))
            x_pct = 0.0
            y_pct = 0.0
            w_pct = 1.0
        elif area == "top_right":
            x_pct = 0.76
            y_pct = 0.0
            w_pct = 0.24
            h_pct = 0.13
        elif area == "top_left":
            x_pct = 0.0
            y_pct = 0.0
            w_pct = 0.24
            h_pct = 0.13
        else:  # "custom" or freeform draggable shape blur
            x_pct = max(0.0, min(float(getattr(req, "delogo_x_pct", 0.0) or 0.0), 0.96))
            y_pct = max(0.0, min(float(getattr(req, "delogo_y_pct", 0.86) or 0.86), 0.96))
            w_pct = max(0.04, min(float(getattr(req, "delogo_w_pct", 1.0) or 1.0), 1.0))
            h_pct = max(0.03, min(float(raw_h), 1.0))
            if x_pct + w_pct > 1.0:
                w_pct = max(0.04, 1.0 - x_pct)
            if y_pct + h_pct > 1.0:
                h_pct = max(0.03, 1.0 - y_pct)

        crop_x = f"trunc(iw*{x_pct:.4f}/2)*2"
        crop_y = f"trunc(ih*{y_pct:.4f}/2)*2"
        crop_w = f"trunc(min(iw-x\\,iw*{w_pct:.4f})/2)*2"
        crop_h = f"trunc(min(ih-y\\,ih*{h_pct:.4f})/2)*2"
        over_x = f"W*{x_pct:.4f}"
        over_y = f"H*{y_pct:.4f}"

        if mode == "black_bar":
            filter_chains.append(f"{current_v}drawbox=x=iw*{x_pct:.4f}:y=ih*{y_pct:.4f}:w=iw*{w_pct:.4f}:h=ih*{h_pct:.4f}:color=black@0.88:t=fill[vdelogo]")
        elif mode == "pixelate":
            filter_chains.append(f"{current_v}split[vbase][vcrop];[vcrop]crop=x={crop_x}:y={crop_y}:w={crop_w}:h={crop_h},scale=max(4\\,trunc(iw/8/2)*2):max(4\\,trunc(ih/8/2)*2):flags=neighbor,scale=iw*8:ih*8:flags=neighbor[vpix];[vbase][vpix]overlay={over_x}:{over_y}[vdelogo]")
        elif mode == "frosted":
            filter_chains.append(f"{current_v}split[vbase][vcrop];[vcrop]crop=x={crop_x}:y={crop_y}:w={crop_w}:h={crop_h},avgblur=sizeX=12:sizeY=12,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.45:t=fill[vfrost];[vbase][vfrost]overlay={over_x}:{over_y}[vdelogo]")
        else:  # "blur" (Gaussian/Box blur)
            filter_chains.append(f"{current_v}split[vbase][vcrop];[vcrop]crop=x={crop_x}:y={crop_y}:w={crop_w}:h={crop_h},avgblur=sizeX=14:sizeY=14[vblur];[vbase][vblur]overlay={over_x}:{over_y}[vdelogo]")
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

        # Map position to FFmpeg overlay coordinate formula (with auto-move corner rotation support)
        if getattr(req, "watermark_auto_move", False):
            move_sec = max(10, getattr(req, "watermark_move_interval", 30) or 30)
            # Cycle every move_sec seconds through 4 corners: 0=TL, 1=TR, 2=BR, 3=BL
            overlay_coord = f"if(eq(mod(floor(t/{move_sec})\\,4)\\,0)\\,{wm_margin}\\,if(eq(mod(floor(t/{move_sec})\\,4)\\,1)\\,W-w-{wm_margin}\\,if(eq(mod(floor(t/{move_sec})\\,4)\\,2)\\,W-w-{wm_margin}\\,{wm_margin}))):if(eq(mod(floor(t/{move_sec})\\,4)\\,0)\\,{wm_margin}\\,if(eq(mod(floor(t/{move_sec})\\,4)\\,1)\\,{wm_margin}\\,if(eq(mod(floor(t/{move_sec})\\,4)\\,2)\\,H-h-{wm_margin}\\,H-h-{wm_margin})))"
        else:
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
            if has_orig_audio and keep_original_audio:
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
                    f"{dubbed_a_in}asplit=2[dub_sc][dub_mix];"
                    f"[bg_all][dub_sc]sidechaincompress=threshold=0.03:ratio={duck_ratio}:attack={attack_ms}:release={release_ms}[ducked_bg];"
                    f"[ducked_bg][dub_mix]amix=inputs=2:duration=first:normalize=0[aout]"
                )
            else:
                filter_chains.append(
                    f"{orig_a_in}volume={req.background_ducking_volume}[ducked];"
                    f"[ducked]{dubbed_a_in}[bgmv]amix=inputs=3:duration=first[aout]"
                )
        else:
            if use_smart_ducking:
                filter_chains.append(
                    f"{dubbed_a_in}asplit=2[dub_sc][dub_mix];"
                    f"[bgmv][dub_sc]sidechaincompress=threshold=0.03:ratio={duck_ratio}:attack={attack_ms}:release={release_ms}[ducked_bg];"
                    f"[ducked_bg][dub_mix]amix=inputs=2:duration=first:normalize=0[aout]"
                )
            else:
                filter_chains.append(
                    f"{dubbed_a_in}[bgmv]amix=inputs=2:duration=first[aout]"
                )
        audio_mapping = "[aout]"

    elif dubbed_in is not None and bgm_in is None:
        if keep_original_audio:
            if use_smart_ducking:
                filter_chains.append(
                    f"{dubbed_a_in}asplit=2[dub_sc][dub_mix];"
                    f"{orig_a_in}[dub_sc]sidechaincompress=threshold=0.03:ratio={duck_ratio}:attack={attack_ms}:release={release_ms}[ducked_orig];"
                    f"[ducked_orig][dub_mix]amix=inputs=2:duration=first:normalize=0[aout]"
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
        full_err = "".join(stderr_buffer)
        if proc.returncode != 0:
            try:
                with open(STORAGE_DIR / "last_render_error.log", "w", encoding="utf-8") as f_err:
                    f_err.write(f"RC: {proc.returncode}\nCOMMAND: {' '.join(full_command)}\n\nSTDERR:\n{full_err}\n")
            except Exception:
                pass
        return proc.returncode, full_err

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

        # Tool 4: Auto Intro / Outro & Sponsor Appender
        enable_intro = getattr(req, "enable_intro", False)
        intro_path = getattr(req, "intro_video_path", None)
        enable_outro = getattr(req, "enable_outro", False)
        outro_path = getattr(req, "outro_video_path", None)

        intro_resolved = None
        outro_resolved = None
        if enable_intro and intro_path:
            try:
                intro_resolved = resolve_video_file(intro_path)
            except Exception as e:
                logger.warning(f"Could not resolve intro video '{intro_path}': {e}")

        if enable_outro and outro_path:
            try:
                outro_resolved = resolve_video_file(outro_path)
            except Exception as e:
                logger.warning(f"Could not resolve outro video '{outro_path}': {e}")

        if (intro_resolved or outro_resolved) and export_path.exists():
            if req.job_id:
                RENDER_PROGRESS[req.job_id]["message"] = "Attaching Intro/Outro branding..."
            
            temp_intermediate = export_path.with_name(f"temp_body_{uuid.uuid4().hex[:6]}_{export_path.name}")
            try:
                export_path.rename(temp_intermediate)
                stitch_list = []
                if intro_resolved:
                    stitch_list.append(str(intro_resolved))
                stitch_list.append(str(temp_intermediate))
                if outro_resolved:
                    stitch_list.append(str(outro_resolved))
                
                concat_videos(
                    video_filenames=stitch_list,
                    custom_output_filename=export_filename,
                    job_id=None
                )
            except Exception as err:
                logger.error(f"Failed to stitch intro/outro: {err}")
                # Restore original if possible
                if temp_intermediate.exists() and not export_path.exists():
                    temp_intermediate.rename(export_path)
            finally:
                if temp_intermediate.exists():
                    try:
                        temp_intermediate.unlink(missing_ok=True)
                    except Exception:
                        pass

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

def resolve_video_file(fn: str) -> Path:
    """Resolves a video filename or path from uploads, exports, or local disk"""
    raw_path = Path(str(fn).split("?")[0])
    if raw_path.is_file() and raw_path.exists():
        return raw_path

    clean = Path(str(fn).replace("/api/exports/", "").replace("/api/video/", "").split("?")[0]).name
    for d in [EXPORTS_DIR, UPLOADS_DIR]:
        p = d / clean
        if p.exists() and p.is_file():
            return p

    stem = Path(clean).stem.lower()
    for d in [EXPORTS_DIR, UPLOADS_DIR]:
        for f in d.glob("*"):
            if f.is_file() and not f.name.startswith(".gitkeep") and f.stem.lower() == stem:
                return f
    raise FileNotFoundError(f"Video file '{fn}' not found in exports, uploads, or local disk.")


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

    resolved_paths: List[Path] = [resolve_video_file(fn) for fn in video_filenames]

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


def parse_time_seconds(val: Any) -> Optional[float]:
    """Parses various time representations (seconds float, 'HH:MM:SS', 'MM:SS') into seconds"""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        pass
    parts = s.split(":")
    try:
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 1:
            return float(parts[0])
    except Exception:
        return None
    return None

def split_video(
    video_filename: str,
    segments: List[Any],
    job_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Splits a video file into multiple segment parts based on custom start and end timestamps.
    Uses ultra-fast stream copy (-c copy) with automatic fallback to high-quality re-encoding.
    """
    if not segments:
        raise ValueError("No split segments provided.")

    src_path = resolve_video_file(video_filename)
    if job_id:
        RENDER_PROGRESS[job_id] = {
            "progress": 5,
            "status": "rendering",
            "message": f"Preparing to split video into {len(segments)} segments..."
        }

    results = []
    total = len(segments)
    src_stem = sanitize_filename(src_path.stem)

    for idx, seg in enumerate(segments):
        if hasattr(seg, "dict"):
            s_dict = seg.dict()
        elif isinstance(seg, dict):
            s_dict = seg
        else:
            s_dict = {
                "start_time": getattr(seg, "start_time", "00:00:00"),
                "end_time": getattr(seg, "end_time", ""),
                "output_filename": getattr(seg, "output_filename", None)
            }

        start_t = str(s_dict.get("start_time") or "00:00:00").strip()
        end_t = str(s_dict.get("end_time") or "").strip()
        out_name = s_dict.get("output_filename")

        if not out_name:
            out_name = f"{src_stem}_Part_{idx + 1}.mp4"
        out_name = sanitize_filename(Path(out_name).name)
        if not out_name.lower().endswith(".mp4"):
            out_name = f"{out_name}.mp4"

        export_path = EXPORTS_DIR / out_name
        try:
            if export_path.exists():
                export_path.unlink(missing_ok=True)
        except Exception:
            out_name = f"{Path(out_name).stem}_{uuid.uuid4().hex[:4]}.mp4"
            export_path = EXPORTS_DIR / out_name

        if job_id:
            pct = int(10 + (idx / total) * 85)
            RENDER_PROGRESS[job_id]["progress"] = pct
            RENDER_PROGRESS[job_id]["message"] = f"Exporting Part {idx + 1}/{total}: {out_name}..."

        # Calculate time arguments safely avoiding FFmpeg '-to smaller than -ss' errors
        start_sec = parse_time_seconds(start_t) or 0.0
        end_sec = parse_time_seconds(end_t)

        time_args = ["-ss", f"{start_sec:.3f}"]
        if end_sec is not None:
            if end_sec > start_sec:
                dur = end_sec - start_sec
                time_args.extend(["-t", f"{dur:.3f}"])
            elif end_sec > 0:
                # Segment was provided with duration rather than absolute timestamp
                time_args.extend(["-t", f"{end_sec:.3f}"])

        # 1. Attempt ultra-fast stream copy:
        cmd = [
            FFMPEG_PATH, "-y",
            *time_args,
            "-i", str(src_path),
            "-map", "0",
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            str(export_path)
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
        success = proc.returncode == 0 and export_path.exists() and export_path.stat().st_size > 1000

        # Fallback to fast re-encoding if stream copy fails
        if not success:
            cmd_re = [
                FFMPEG_PATH, "-y",
                *time_args,
                "-i", str(src_path),
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                "-avoid_negative_ts", "make_zero",
                str(export_path)
            ]
            proc2 = subprocess.run(cmd_re, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
            if proc2.returncode != 0 or not export_path.exists() or export_path.stat().st_size < 1000:
                raise RuntimeError(f"Failed to split segment {idx + 1} ({out_name}): {proc2.stderr[-400:]}")

        size_mb = round(export_path.stat().st_size / (1024 * 1024), 2)
        results.append({
            "filename": out_name,
            "export_filename": out_name,
            "download_url": f"/api/exports/{urllib.parse.quote(out_name)}",
            "start_time": start_t,
            "end_time": end_t,
            "size_mb": size_mb,
            "part_index": idx + 1
        })

    if job_id:
        RENDER_PROGRESS[job_id]["progress"] = 100
        RENDER_PROGRESS[job_id]["status"] = "completed"
        RENDER_PROGRESS[job_id]["message"] = f"Successfully created {len(results)} split videos!"

    return results

def render_mirror_video(
    video_filename: str,
    mirror_horizontal: bool = True,
    flip_vertical: bool = False,
    rotate_angle: int = 0,
    use_gpu: bool = True,
    custom_output_filename: Optional[str] = None,
    job_id: Optional[str] = None
) -> Dict[str, Any]:
    """Fast video mirror and flip transform with hardware acceleration"""
    src_path = resolve_video_file(video_filename)
    if not src_path or not src_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_filename}")

    if job_id:
        RENDER_PROGRESS[job_id] = {
            "progress": 5,
            "status": "processing",
            "message": "Initializing fast video mirror / flip..."
        }

    # Build orientation filter
    orient_filters = []
    if mirror_horizontal:
        orient_filters.append("hflip")
    if flip_vertical:
        orient_filters.append("vflip")
    rot = rotate_angle or 0
    if rot == 90:
        orient_filters.append("transpose=1")
    elif rot == 180:
        orient_filters.append("hflip,vflip")
    elif rot == 270:
        orient_filters.append("transpose=2")

    if not orient_filters:
        orient_filters.append("null")

    filter_str = ",".join(orient_filters)

    # Determine output filename
    if custom_output_filename:
        out_name = Path(custom_output_filename).name
        if not out_name.endswith(".mp4"):
            out_name += ".mp4"
    else:
        stem = src_path.stem
        tag = []
        if mirror_horizontal: tag.append("mirrored")
        if flip_vertical: tag.append("vflipped")
        if rot: tag.append(f"rot{rot}")
        tag_str = "_".join(tag) if tag else "flipped"
        out_name = f"{stem}_{tag_str}.mp4"

    export_path = EXPORTS_DIR / out_name
    counter = 1
    while export_path.exists():
        export_path = EXPORTS_DIR / f"{Path(out_name).stem}_{counter}.mp4"
        counter += 1
    out_name = export_path.name

    # Select encoder
    if use_gpu:
        encoder_args = ["-c:v", "h264_amf", "-quality", "speed", "-rc", "cbr", "-pix_fmt", "yuv420p"]
    else:
        encoder_args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p"]

    cmd = [
        FFMPEG_PATH, "-y",
        "-i", str(src_path),
        "-vf", filter_str,
        *encoder_args,
        "-c:a", "copy",
        "-avoid_negative_ts", "make_zero",
        str(export_path)
    ]

    if job_id:
        RENDER_PROGRESS[job_id]["progress"] = 35
        RENDER_PROGRESS[job_id]["message"] = "Processing video mirror transform..."

    proc = subprocess.run(cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
    if proc.returncode != 0 or not export_path.exists() or export_path.stat().st_size < 1000:
        # Fallback to standard CPU libx264
        cmd_cpu = [
            FFMPEG_PATH, "-y",
            "-i", str(src_path),
            "-vf", filter_str,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
            "-c:a", "copy",
            str(export_path)
        ]
        proc2 = subprocess.run(cmd_cpu, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
        if proc2.returncode != 0 or not export_path.exists() or export_path.stat().st_size < 1000:
            raise RuntimeError(f"Video mirror processing failed: {proc2.stderr[-400:]}")

    if job_id:
        RENDER_PROGRESS[job_id]["progress"] = 100
        RENDER_PROGRESS[job_id]["status"] = "completed"
        RENDER_PROGRESS[job_id]["message"] = "Video mirrored successfully!"

    size_mb = round(export_path.stat().st_size / (1024 * 1024), 2)
    return {
        "status": "success",
        "filename": out_name,
        "export_filename": out_name,
        "download_url": f"/api/exports/{urllib.parse.quote(out_name)}",
        "size_mb": size_mb
    }
