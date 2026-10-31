import sys
import asyncio

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from backend.app.services.subtitle_parser import (
    parse_srt,
    auto_fix_overlaps,
    export_srt,
    export_vtt,
    export_ass
)
from backend.app.services.tts_engine import (
    generate_speech_for_text,
    get_audio_duration
)
from backend.app.services.translator import translate_text_google_free
from backend.app.models.subtitle import VideoBurnRequest
from backend.app.services.ffmpeg_runner import render_and_burn_video, probe_video
from backend.app.config import UPLOADS_DIR, EXPORTS_DIR, FFMPEG_PATH
import subprocess

SAMPLE_SRT = """1
00:00:01,000 --> 00:00:03,500
Hello and welcome to MK Subtitle Studio!

2
00:00:03,200 --> 00:00:06,000
This is an automated test of subtitle parsing and dubbing.
"""

async def run_tests():
    print("=== [1] Testing Subtitle Parser ===")
    items = parse_srt(SAMPLE_SRT)
    assert len(items) == 2
    print(f"Parsed {len(items)} items.")

    print("\n=== [2] Testing Overlap Fixer ===")
    fixed = auto_fix_overlaps(items)
    assert fixed[0].end_time <= fixed[1].start_time

    print("\n=== [3] Testing Export Formats ===")
    srt_out = export_srt(fixed)
    vtt_out = export_vtt(fixed)
    ass_out = export_ass(fixed)
    assert "WEBVTT" in vtt_out

    print("\n=== [4] Testing Google Free Translation ===")
    translated = await translate_text_google_free("Hello and welcome!", source_lang="en", target_lang="km")
    print(f"Khmer Translation: {translated}")

    print("\n=== [5] Testing Robust Edge-TTS Speech Generation ===")
    tts_res = await generate_speech_for_text(
        text="សួស្តី MK Subtitle Studio!",
        voice="km-KH-PisethNeural",
        target_duration=3.0,
        auto_fit=True
    )
    print(f"Generated TTS audio: {tts_res['audio_filename']} (duration: {tts_res['duration']}s)")
    assert tts_res["duration"] > 0

    print("\n=== [6] Testing Video Render & Subtitle Burning ===")
    # Ensure test video exists
    test_vid = UPLOADS_DIR / "test_sample.mp4"
    if not test_vid.exists():
        subprocess.run([
            FFMPEG_PATH, "-y",
            "-f", "lavfi", "-i", "testsrc=duration=2:size=640x360:rate=25",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
            "-c:v", "libx264", "-c:a", "aac",
            str(test_vid)
        ], check=True)

    burn_req = VideoBurnRequest(
        video_filename="test_sample.mp4",
        items=fixed,
        use_translation=False,
        include_dubbing=False,
        use_amf_gpu=True,
        add_logo_watermark=True
    )
    rendered_file = render_and_burn_video(burn_req)
    print(f"Rendered video: {rendered_file}")
    assert rendered_file.endswith(".mp4")
    rendered_info = probe_video(EXPORTS_DIR / rendered_file)
    assert rendered_info.get("has_audio") is True, "Original video audio/music must NOT be muted when rendered without Khmer voice!"

    print("\n✅ ALL TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(run_tests())

