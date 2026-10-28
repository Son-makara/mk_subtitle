import os
import asyncio
import uuid
import subprocess
import edge_tts
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..config import AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH
from ..models.subtitle import SubtitleItem

# Curated popular voices with readable labels
CURATED_VOICES = [
    # Khmer
    {"name": "km-KH-PisethNeural", "lang": "km-KH", "gender": "Male", "label": "Khmer - Piseth (Male)"},
    {"name": "km-KH-SreymomNeural", "lang": "km-KH", "gender": "Female", "label": "Khmer - Sreymom (Female)"},
    # English
    {"name": "en-US-GuyNeural", "lang": "en-US", "gender": "Male", "label": "English (US) - Guy (Male)"},
    {"name": "en-US-JennyNeural", "lang": "en-US", "gender": "Female", "label": "English (US) - Jenny (Female)"},
    {"name": "en-US-AriaNeural", "lang": "en-US", "gender": "Female", "label": "English (US) - Aria (Female)"},
    {"name": "en-GB-RyanNeural", "lang": "en-GB", "gender": "Male", "label": "English (UK) - Ryan (Male)"},
    {"name": "en-GB-SoniaNeural", "lang": "en-GB", "gender": "Female", "label": "English (UK) - Sonia (Female)"},
    # Chinese
    {"name": "zh-CN-XiaoxiaoNeural", "lang": "zh-CN", "gender": "Female", "label": "Chinese - Xiaoxiao (Female)"},
    {"name": "zh-CN-YunxiNeural", "lang": "zh-CN", "gender": "Male", "label": "Chinese - Yunxi (Male)"},
    {"name": "zh-CN-YunjianNeural", "lang": "zh-CN", "gender": "Male", "label": "Chinese - Yunjian (Sports/Fast Male)"},
    # Vietnamese
    {"name": "vi-VN-NamMinhNeural", "lang": "vi-VN", "gender": "Male", "label": "Vietnamese - Nam Minh (Male)"},
    {"name": "vi-VN-HoaiMyNeural", "lang": "vi-VN", "gender": "Female", "label": "Vietnamese - Hoai My (Female)"},
    # Thai
    {"name": "th-TH-NiwatNeural", "lang": "th-TH", "gender": "Male", "label": "Thai - Niwat (Male)"},
    {"name": "th-TH-PremwadeeNeural", "lang": "th-TH", "gender": "Female", "label": "Thai - Premwadee (Female)"},
    # Japanese
    {"name": "ja-JP-NanamiNeural", "lang": "ja-JP", "gender": "Female", "label": "Japanese - Nanami (Female)"},
    {"name": "ja-JP-KeitaNeural", "lang": "ja-JP", "gender": "Male", "label": "Japanese - Keita (Male)"},
    # Korean
    {"name": "ko-KR-SunHiNeural", "lang": "ko-KR", "gender": "Female", "label": "Korean - Sun-Hi (Female)"},
    {"name": "ko-KR-InJoonNeural", "lang": "ko-KR", "gender": "Male", "label": "Korean - InJoon (Male)"},
    # French & Spanish
    {"name": "fr-FR-HenriNeural", "lang": "fr-FR", "gender": "Male", "label": "French - Henri (Male)"},
    {"name": "es-ES-AlvaroNeural", "lang": "es-ES", "gender": "Male", "label": "Spanish - Alvaro (Male)"},
]

async def get_all_voices() -> List[Dict[str, Any]]:
    """Returns curated list and dynamically queries edge-tts if needed"""
    try:
        raw_voices = await edge_tts.list_voices()
        formatted = []
        for v in raw_voices:
            formatted.append({
                "name": v["ShortName"],
                "lang": v["Locale"],
                "gender": v["Gender"],
                "label": f"{v['Locale']} - {v['ShortName'].split('-')[-1].replace('Neural', '')} ({v['Gender']})"
            })
        return formatted if formatted else CURATED_VOICES
    except Exception:
        return CURATED_VOICES

def get_audio_duration(file_path: str) -> float:
    """Uses ffprobe to inspect exact duration in seconds"""
    try:
        cmd = [
            FFPROBE_PATH,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(result.stdout.strip())
    except Exception:
        return 0.0

def time_stretch_audio(input_file: str, output_file: str, tempo_ratio: float) -> bool:
    """Uses FFmpeg atempo filter to accelerate audio without changing pitch"""
    try:
        # atempo in FFmpeg supports values between 0.5 and 2.0 per filter stage
        # Build filter chain if tempo_ratio > 2.0
        filters = []
        rem = tempo_ratio
        while rem > 2.0:
            filters.append("atempo=2.0")
            rem /= 2.0
        filters.append(f"atempo={rem:.3f}")
        filter_str = ",".join(filters)

        cmd = [
            FFMPEG_PATH, "-y",
            "-i", input_file,
            "-filter:a", filter_str,
            "-vn",
            output_file
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        print(f"Error time-stretching audio: {e}")
        return False

async def generate_speech_for_text(
    text: str,
    voice: str = "km-KH-PisethNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
    target_duration: Optional[float] = None,
    auto_fit: bool = True,
    custom_speed: Optional[float] = None
) -> Dict[str, Any]:
    """Generates audio via edge-tts with automatic voice fallback, measures duration, and auto-fits if requested"""
    unique_id = str(uuid.uuid4())[:10]
    raw_filename = f"tts_raw_{unique_id}.mp3"
    raw_path = AUDIO_CACHE_DIR / raw_filename

    # Clean text to prevent XML/SSML parser anomalies
    clean_text = text.strip()

    try:
        communicate = edge_tts.Communicate(text=clean_text, voice=voice, rate=rate, pitch=pitch, volume=volume)
        await communicate.save(str(raw_path))
    except Exception as e:
        # If voice fails (e.g. Piseth on mixed/unsupported tokens), auto-fallback to alternative gender voice
        fallback_voice = "km-KH-SreymomNeural" if "Piseth" in voice else "km-KH-PisethNeural"
        print(f"Edge-TTS warning: voice '{voice}' failed ({e}). Auto-retrying with fallback voice '{fallback_voice}'...")
        communicate = edge_tts.Communicate(text=clean_text, voice=fallback_voice, rate=rate, pitch=pitch, volume=volume)
        await communicate.save(str(raw_path))

    duration = get_audio_duration(str(raw_path))
    final_filename = raw_filename
    final_path = raw_path
    is_exceeded = False
    effective_speed = 1.0

    if custom_speed and abs(custom_speed - 1.0) > 0.05:
        stretched_filename = f"tts_spd_{unique_id}.mp3"
        stretched_path = AUDIO_CACHE_DIR / stretched_filename
        if time_stretch_audio(str(raw_path), str(stretched_path), custom_speed):
            final_filename = stretched_filename
            final_path = stretched_path
            duration = get_audio_duration(str(final_path))
            effective_speed = round(custom_speed, 1)
    elif target_duration and target_duration > 0.1:
        if duration > target_duration:
            is_exceeded = True
            if auto_fit:
                tempo = min(duration / target_duration, 2.5)
                stretched_filename = f"tts_fit_{unique_id}.mp3"
                stretched_path = AUDIO_CACHE_DIR / stretched_filename
                if time_stretch_audio(str(raw_path), str(stretched_path), tempo):
                    final_filename = stretched_filename
                    final_path = stretched_path
                    duration = get_audio_duration(str(final_path))
                    is_exceeded = False
                    effective_speed = round(tempo, 1)

    return {
        "audio_filename": final_filename,
        "audio_url": f"/api/audio/{final_filename}",
        "duration": round(duration, 3),
        "is_duration_exceeded": is_exceeded,
        "speed": effective_speed
    }

async def generate_batch_tts(
    items: List[SubtitleItem],
    use_translation: bool = True,
    voice: Optional[str] = None,
    voice_male: str = "km-KH-PisethNeural",
    voice_female: str = "km-KH-SreymomNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
    auto_fit: bool = True
) -> List[SubtitleItem]:
    """Generates TTS for items using their gender profile (Male/Female)"""
    sem = asyncio.Semaphore(4) # Run up to 4 parallel edge-tts connections

    async def process_item(item: SubtitleItem):
        async with sem:
            speech_text = (item.translated_text if (use_translation and item.translated_text) else item.text) or ""
            if not speech_text.strip():
                item.audio_status = "idle"
                return item

            # Pick voice based on item gender if specific voice not overridden
            selected_voice = voice
            if not selected_voice:
                selected_voice = voice_male if item.gender == "Male" else voice_female

            sub_duration = max(item.end_time - item.start_time, 0.5)
            custom_spd = item.speed if (item.speed and abs(item.speed - 1.0) > 0.05) else None
            try:
                res = await generate_speech_for_text(
                    text=speech_text,
                    voice=selected_voice,
                    rate=rate,
                    pitch=pitch,
                    volume=volume,
                    target_duration=sub_duration,
                    auto_fit=auto_fit,
                    custom_speed=custom_spd
                )
                item.audio_url = res["audio_url"]
                item.audio_duration = res["duration"]
                item.base_audio_duration = res["duration"]
                item.audio_start = item.start_time
                item.audio_end = round(item.start_time + res["duration"], 2)
                item.is_duration_exceeded = res["is_duration_exceeded"]
                item.speed = res.get("speed", 1.0)
                item.audio_status = "ready"
            except Exception as e:
                print(f"Error generating TTS for item #{item.index}: {e}")
                item.audio_status = "error"
            return item

    tasks = [process_item(it.model_copy()) for it in items]
    results = await asyncio.gather(*tasks)
    return results

