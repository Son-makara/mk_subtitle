import os
import subprocess
import uuid
from pathlib import Path
from typing import List, Optional
import numpy as np
import soundfile as sf

from ..config import AUDIO_CACHE_DIR, UPLOADS_DIR, FFMPEG_PATH, FFPROBE_PATH, SUBPROCESS_FLAGS
from ..models.subtitle import SubtitleItem

def build_dubbed_audio_track(
    items: List[SubtitleItem],
    total_duration: float,
    output_filename: Optional[str] = None
) -> str:
    """
    Places each generated TTS audio piece at its exact item.start_time on an audio timeline.
    Outputs a consolidated full-length dubbing audio track (WAV/M4A).
    Supports arbitrarily long videos (1h, 2h, 3h) with 1,000+ clips without command line limits.
    """
    if not output_filename:
        output_filename = f"dubbed_timeline_{uuid.uuid4().hex[:8]}.m4a"
    output_path = AUDIO_CACHE_DIR / output_filename

    # Filter items that have audio_url
    raw_audio_items = []
    for it in items:
        if it.audio_url:
            clean_url = str(it.audio_url).split("?")[0]
            fname = Path(clean_url).name
            fpath = AUDIO_CACHE_DIR / fname
            if not fpath.exists():
                if (UPLOADS_DIR / fname).exists():
                    fpath = UPLOADS_DIR / fname
                elif Path(clean_url).exists():
                    fpath = Path(clean_url)

            if fpath.exists():
                start_sec = it.audio_start if (it.audio_start is not None) else it.start_time
                dur = it.audio_duration or 2.0
                raw_audio_items.append((max(start_sec, 0.0), dur, fpath))

    if not raw_audio_items:
        # No actual audio files found to mix; return None so caller knows there is no dubbed voice
        return None

    # Strict Lip-Sync: audio clips start on time with each character on screen
    raw_audio_items.sort(key=lambda x: x[0])
    audio_items = raw_audio_items
    max_audio_end = max((s + d for s, d, _ in raw_audio_items), default=0.0)

    # Ensure total duration encompasses all dubbed clips
    final_duration = max(total_duration, max_audio_end, 1.0)

    return _mix_audio_numpy(audio_items, final_duration, output_path)

def _mix_audio_numpy(audio_items, final_duration: float, output_path: Path, target_sr: int = 44100) -> str:
    """Mixes audio clips into a continuous audio timeline in memory with Strict Lip-Sync and anti-collision crossfade"""
    total_samples = int(final_duration * target_sr) + target_sr
    timeline = np.zeros((total_samples, 2), dtype=np.float32)

    # Sort items chronologically by start time
    sorted_items = sorted(audio_items, key=lambda x: x[0])

    for i, item_data in enumerate(sorted_items):
        start_sec = item_data[0]
        fpath = item_data[-1]
        try:
            clip, sr = sf.read(str(fpath))
            if clip.ndim == 1:
                clip = np.column_stack([clip, clip])

            # Resample if sample rate doesn't match 44.1kHz
            if sr != target_sr:
                ratio = target_sr / sr
                new_len = int(len(clip) * ratio)
                x_old = np.linspace(0, 1, len(clip))
                x_new = np.linspace(0, 1, new_len)
                clip = np.column_stack([
                    np.interp(x_new, x_old, clip[:, 0]),
                    np.interp(x_new, x_old, clip[:, 1])
                ])

            start_idx = int(start_sec * target_sr)
            max_len = len(clip)

            # Strict Lip-Sync & Anti-Overlap Trimming:
            # If the next clip starts before this clip finishes, trim this clip with a smooth 40ms fade-out
            # so Character 2's voice starts on time and Character 1 never speaks over Character 2.
            if i < len(sorted_items) - 1:
                next_start_sec = sorted_items[i + 1][0]
                if next_start_sec > start_sec:
                    allowed_samples = int((next_start_sec - start_sec) * target_sr)
                    if allowed_samples < max_len:
                        max_len = allowed_samples
                        # Smooth 40ms fade-out to prevent any pop/click artifact
                        fade_len = min(int(0.04 * target_sr), max_len)
                        if fade_len > 0:
                            fade_curve = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
                            clip[max_len - fade_len:max_len, 0] *= fade_curve
                            clip[max_len - fade_len:max_len, 1] *= fade_curve

            end_idx = min(start_idx + max_len, total_samples)
            actual_len = end_idx - start_idx
            if actual_len > 0:
                timeline[start_idx:end_idx] += clip[:actual_len]
        except Exception as e:
            print(f"Notice: could not mix audio clip {fpath}: {e}")

    # Normalize to prevent digital audio clipping
    peak = float(np.max(np.abs(timeline)))
    if peak > 0.98:
        timeline = timeline / peak * 0.95

    temp_wav = output_path.with_suffix(".temp_mix.wav")
    valid_samples = int(final_duration * target_sr)
    sf.write(str(temp_wav), timeline[:valid_samples], target_sr, subtype="PCM_16")

    # Encode to AAC
    cmd = [
        FFMPEG_PATH, "-y",
        "-i", str(temp_wav),
        "-c:a", "aac",
        "-b:a", "192k",
        str(output_path)
    ]
    subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=SUBPROCESS_FLAGS
    )
    if temp_wav.exists():
        try:
            temp_wav.unlink()
        except Exception:
            pass

    return str(output_path)

def _mix_audio_ffmpeg(audio_items, final_duration: float, output_path: Path) -> str:
    """Standard FFmpeg filter_complex mixer for smaller sets"""
    inputs = ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
    filter_complex = []
    mix_inputs = ["[0:a]"]

    for idx, (start_sec, fpath) in enumerate(audio_items, start=1):
        inputs.extend(["-i", str(fpath)])
        delay_ms = int(max(start_sec, 0.0) * 1000)
        filter_complex.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[delayed{idx}]")
        mix_inputs.append(f"[delayed{idx}]")

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
