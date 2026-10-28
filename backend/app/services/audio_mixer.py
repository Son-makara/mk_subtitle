import os
import subprocess
import uuid
from pathlib import Path
from typing import List, Optional

from ..config import AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH
from ..models.subtitle import SubtitleItem

def build_dubbed_audio_track(
    items: List[SubtitleItem],
    total_duration: float,
    output_filename: Optional[str] = None
) -> str:
    """
    Places each generated TTS audio piece at its exact item.start_time on an audio timeline.
    Outputs a consolidated full-length dubbing audio track (WAV/AAC).
    """
    if not output_filename:
        output_filename = f"dubbed_timeline_{uuid.uuid4().hex[:8]}.m4a"
    output_path = AUDIO_CACHE_DIR / output_filename

    # Filter items that have audio_url
    audio_items = []
    for it in items:
        if it.audio_url:
            # audio_url is like '/api/audio/tts_raw_xxxx.mp3'
            fname = Path(it.audio_url).name
            fpath = AUDIO_CACHE_DIR / fname
            if fpath.exists():
                audio_items.append((it.start_time, fpath))

    if not audio_items:
        # Create silent track of total_duration
        cmd = [
            FFMPEG_PATH, "-y",
            "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
            "-t", str(max(total_duration, 1.0)),
            "-c:a", "aac",
            str(output_path)
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return str(output_path)

    # Construct FFmpeg complex filter with adelay and amix
    # First input: silent background matching total duration
    inputs = ["-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo"]
    filter_complex = []
    mix_inputs = ["[0:a]"]

    for idx, (start_sec, fpath) in enumerate(audio_items, start=1):
        inputs.extend(["-i", str(fpath)])
        delay_ms = int(max(start_sec, 0.0) * 1000)
        # adelay takes delay in ms for left|right channel
        filter_complex.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[delayed{idx}]")
        mix_inputs.append(f"[delayed{idx}]")

    # Combine all delayed audio streams
    mix_filter = f"{''.join(mix_inputs)}amix=inputs={len(mix_inputs)}:normalize=0[mixed]"
    filter_complex.append(mix_filter)

    full_filter = ";".join(filter_complex)

    cmd = [
        FFMPEG_PATH, "-y",
        *inputs,
        "-filter_complex", full_filter,
        "-map", "[mixed]",
        "-t", str(max(total_duration, 1.0)),
        "-c:a", "aac",
        "-b:a", "192k",
        str(output_path)
    ]

    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return str(output_path)

