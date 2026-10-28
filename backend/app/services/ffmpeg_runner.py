import os
import json
import uuid
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from ..config import UPLOADS_DIR, EXPORTS_DIR, AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH, BASE_DIR
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
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
        
        duration = float(data.get("format", {}).get("duration", 0.0))
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
        
        width = int(video_stream.get("width", 1920)) if video_stream else 1920
        height = int(video_stream.get("height", 1080)) if video_stream else 1080
        
        return {
            "duration": round(duration, 3),
            "width": width,
            "height": height,
            "has_audio": audio_stream is not None,
            "codec": video_stream.get("codec_name", "unknown") if video_stream else "none"
        }
    except Exception as e:
        print(f"Probe video failed: {e}")
        return {"duration": 0.0, "width": 1920, "height": 1080, "has_audio": False}

def render_and_burn_video(req: VideoBurnRequest) -> str:
    """
    Renders video with burned-in subtitles and optional dubbed audio track.
    Utilizes AMD AMF GPU encoding with automatic CPU fallback.
    """
    video_path = resolve_media_file(req.video_filename)

    probe = probe_video(video_path)
    total_dur = probe.get("duration", 10.0)

    # 1. Generate temp ASS file
    ass_content = export_ass(
        req.items,
        use_translated=req.use_translation,
        style_preset=req.subtitle_style
    )
    temp_id = uuid.uuid4().hex[:8]
    temp_ass_path = AUDIO_CACHE_DIR / f"temp_{temp_id}.ass"
    with open(temp_ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    # Prepare export path
    export_filename = f"mk_sub_{Path(req.video_filename).stem}_{temp_id}.mp4"
    export_path = EXPORTS_DIR / export_filename

    # Format path for FFmpeg filter (escape colons and backslashes for Windows)
    ass_filter_path = str(temp_ass_path).replace("\\", "/").replace(":", "\\:")
    vf_filter = f"subtitles='{ass_filter_path}'"

    # 2. Check if dubbing audio is requested
    dubbed_audio_path = None
    if req.include_dubbing:
        has_dubbing_items = any(it.audio_url for it in req.items)
        if has_dubbing_items:
            dubbed_audio_path = build_dubbed_audio_track(req.items, total_dur)

    # 3. Assemble FFmpeg command
    cmd = [FFMPEG_PATH, "-y", "-i", str(video_path)]

    bgm_path = None
    if req.bgm_filename:
        for possible in [AUDIO_CACHE_DIR / req.bgm_filename, UPLOADS_DIR / req.bgm_filename]:
            if possible.exists():
                bgm_path = str(possible)
                break

    # Check if logo watermark is requested
    logo_path = BASE_DIR / "assets" / "logo.png"
    has_watermark = req.add_logo_watermark and logo_path.exists()
    logo_idx = None
    if has_watermark:
        cmd.extend(["-i", str(logo_path)])
        logo_idx = len(cmd) - 2

    def build_video_filter() -> str:
        if has_watermark:
            return f"[0:v]{vf_filter}[vsub];[{logo_idx}:v]scale=90:-1[logo];[vsub][logo]overlay=W-w-20:20[vout]"
        return f"[0:v]{vf_filter}[vout]"

    # Determine if original video audio should be kept
    keep_original_audio = (
        not req.mute_original_audio
        and probe.get("has_audio", False)
        and req.background_ducking_volume > 0.01
    )

    if dubbed_audio_path:
        cmd.extend(["-i", dubbed_audio_path])
        if bgm_path:
            cmd.extend(["-stream_loop", "-1", "-i", bgm_path])
            # 0:v, 0:a (orig), 1:a (dubbed), 2:a (bgm)
            if keep_original_audio:
                duck_filter = f"[0:a]volume={req.background_ducking_volume}[ducked];[2:a]volume={req.bgm_volume}[bgmv];[ducked][1:a][bgmv]amix=inputs=3:duration=first[aout]"
            else:
                duck_filter = f"[2:a]volume={req.bgm_volume}[bgmv];[1:a][bgmv]amix=inputs=2:duration=first[aout]"
            cmd.extend([
                "-filter_complex", f"{build_video_filter()};{duck_filter}",
                "-map", "[vout]",
                "-map", "[aout]"
            ])
        else:
            if keep_original_audio:
                # Duck original audio (stream 0:a) to background volume, and mix with dubbing (stream 1:a)
                duck_filter = f"[0:a]volume={req.background_ducking_volume}[ducked];[ducked][1:a]amix=inputs=2:duration=first[aout]"
                cmd.extend([
                    "-filter_complex", f"{build_video_filter()};{duck_filter}",
                    "-map", "[vout]",
                    "-map", "[aout]"
                ])
            else:
                # Pure dubbing audio track (Original speech 100% removed!)
                if has_watermark:
                    cmd.extend([
                        "-filter_complex", build_video_filter(),
                        "-map", "[vout]",
                        "-map", "1:a"
                    ])
                else:
                    cmd.extend([
                        "-vf", vf_filter,
                        "-map", "0:v",
                        "-map", "1:a"
                    ])
    elif bgm_path:
        cmd.extend(["-stream_loop", "-1", "-i", bgm_path])
        if keep_original_audio:
            mix_filter = f"[0:a]volume={req.background_ducking_volume}[orig];[1:a]volume={req.bgm_volume}[bgmv];[orig][bgmv]amix=inputs=2:duration=first[aout]"
            cmd.extend([
                "-filter_complex", f"{build_video_filter()};{mix_filter}",
                "-map", "[vout]",
                "-map", "[aout]"
            ])
        else:
            # Pure BGM audio track (Original speech 100% removed!)
            cmd.extend([
                "-filter_complex", f"{build_video_filter()};[1:a]volume={req.bgm_volume}[aout]",
                "-map", "[vout]",
                "-map", "[aout]"
            ])
    else:
        if has_watermark:
            cmd.extend([
                "-filter_complex", build_video_filter(),
                "-map", "[vout]"
            ])
            if req.mute_original_audio:
                cmd.append("-an")
            else:
                cmd.extend(["-map", "0:a?"])
        else:
            if req.mute_original_audio:
                # Subtitle burn with original audio completely stripped
                cmd.extend([
                    "-vf", vf_filter,
                    "-map", "0:v",
                    "-an"
                ])
            else:
                # Standard subtitle burn preserving original audio
                cmd.extend([
                    "-vf", vf_filter,
                    "-map", "0:v",
                    "-map", "0:a?"
                ])

    # 4. Encoding settings (AMD AMF or CPU)
    if req.use_amf_gpu:
        cmd.extend([
            "-c:v", "h264_amf",
            "-quality", "speed",
            "-rc", "cbr",
            "-b:v", "6M",
            "-c:a", "aac",
            "-b:a", "192k",
            str(export_path)
        ])
    else:
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            str(export_path)
        ])

    # Run FFmpeg render
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc.returncode != 0:
            print(f"AMF render returned non-zero code, attempting fallback to libx264... Error was: {proc.stderr[:300]}")
            # Fallback to standard libx264
            cmd_fallback = cmd.copy()
            idx = cmd_fallback.index("-c:v")
            cmd_fallback[idx + 1] = "libx264"
            # Remove AMF specific flags
            for flag in ["-quality", "-rc", "-b:v"]:
                if flag in cmd_fallback:
                    f_idx = cmd_fallback.index(flag)
                    del cmd_fallback[f_idx:f_idx+2]
            # Add crf
            cmd_fallback.insert(idx + 2, "-crf")
            cmd_fallback.insert(idx + 3, "22")
            subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    finally:
        # Clean up temp ASS file
        if temp_ass_path.exists():
            try:
                os.remove(temp_ass_path)
            except Exception:
                pass

    return export_filename

