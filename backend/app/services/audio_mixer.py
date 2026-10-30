import os
import subprocess
import uuid
from pathlib import Path
from typing import List, Optional

from ..config import AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH, SUBPROCESS_FLAGS
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
    max_audio_end = 0.0
    for it in items:
        if it.audio_url:
            # audio_url is like '/api/audio/tts_raw_xxxx.mp3'
            clean_url = str(it.audio_url).split("?")[0]
            fname = Path(clean_url).name
            fpath = AUDIO_CACHE_DIR / fname
            if fpath.exists():
                start_sec = it.audio_start if (it.audio_start is not None) else it.start_time
                dur = it.audio_duration or 2.0
                max_audio_end = max(max_audio_end, start_sec + dur)
                audio_items.append((max(start_sec, 0.0), fpath))

    # Ensure total duration encompasses all dubbed clips
    final_duration = max(total_duration, max_audio_end, 1.0)

    if not audio_items:
        # Create silent track of final_duration
        cmd = [
            FFMPEG_PATH, "-y",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-t", str(final_duration),
            "-c:a", "aac",
            str(output_path)
        ]
        subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            creationflags=SUBPROCESS_FLAGS
        )
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
        "-t", str(final_duration),
        "-threads", "0",
        "-c:a", "aac",
        "-b:a", "192k",
        str(output_path)
    ]

    subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
        creationflags=SUBPROCESS_FLAGS
    )
    return str(output_path)

