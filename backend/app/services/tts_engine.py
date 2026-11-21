import os
import re
import asyncio
import uuid
import subprocess
import edge_tts
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..config import AUDIO_CACHE_DIR, FFMPEG_PATH, FFPROBE_PATH, SUBPROCESS_FLAGS
from ..models.subtitle import SubtitleItem

CHINESE_CHAR_REGEX = re.compile(r'[\u4e00-\u9fff]')

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
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            creationflags=SUBPROCESS_FLAGS
        )
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
            "-threads", "0",
            "-vn",
            output_file
        ]
        subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            creationflags=SUBPROCESS_FLAGS
        )
        return True
    except Exception as e:
        print(f"Error time-stretching audio: {e}")
        return False

# ==================== Meta MMS-TTS Khmer 100% Offline Engine ====================

_MMS_KHM_MODEL = None
_MMS_KHM_TOKENIZER = None

def is_mms_khmer_available() -> bool:
    """Checks if MMS-TTS Khmer model is cached locally on disk"""
    try:
        cache_dir = os.path.expanduser(r"~/.cache/huggingface/hub/models--facebook--mms-tts-khm")
        return os.path.exists(cache_dir)
    except Exception:
        return False

def get_mms_khmer_model():
    """Lazy-loads Meta MMS-TTS Khmer VITS model onto CPU or GPU"""
    global _MMS_KHM_MODEL, _MMS_KHM_TOKENIZER
    if _MMS_KHM_MODEL is None or _MMS_KHM_TOKENIZER is None:
        from transformers import VitsModel, AutoTokenizer
        model_id = "facebook/mms-tts-khm"
        print("Loading Meta MMS-TTS Khmer Offline Voice model...")
        _MMS_KHM_TOKENIZER = AutoTokenizer.from_pretrained(model_id)
        _MMS_KHM_MODEL = VitsModel.from_pretrained(model_id)
    return _MMS_KHM_TOKENIZER, _MMS_KHM_MODEL

def generate_speech_mms_khmer_sync(
    text: str,
    output_path: str,
    gender: str = "Female"
) -> bool:
    """Generates Khmer speech offline using Meta MMS-TTS VITS with gender pitch modulation"""
    import torch
    import soundfile as sf
    clean_text = text.strip()
    if not clean_text:
        return False

    tokenizer, model = get_mms_khmer_model()
    inputs = tokenizer(clean_text, return_tensors="pt")
    with torch.no_grad():
        output = model(**inputs).waveform
    waveform = output.squeeze().cpu().numpy()
    sr = getattr(model.config, "sampling_rate", 16000)

    # Temporary raw WAV output
    temp_raw = output_path + ".tmp.wav"
    sf.write(temp_raw, waveform, sr)

    # Format pitch based on gender profile (Male: deeper masculine voice; Female: natural voice)
    if gender == "Male":
        pitch_filter = f"asetrate={int(sr * 0.90)},atempo=1.11,aresample={sr},equalizer=f=160:t=q:w=1:g=3"
    else:
        pitch_filter = f"aresample={sr}"

    cmd = [
        FFMPEG_PATH, "-y",
        "-i", temp_raw,
        "-af", pitch_filter,
        "-threads", "0",
        "-vn",
        output_path
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, creationflags=SUBPROCESS_FLAGS)
        if os.path.exists(temp_raw):
            try:
                os.remove(temp_raw)
            except Exception:
                pass
        return True
    except Exception as e:
        print(f"Notice: MMS pitch filter fallback ({e})")
        if os.path.exists(temp_raw):
            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass
            os.rename(temp_raw, output_path)
        return True

async def generate_speech_for_text(
    text: str,
    voice: str = "km-KH-PisethNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
    target_duration: Optional[float] = None,
    auto_fit: bool = True,
    custom_speed: Optional[float] = None,
    engine: str = "edge-tts",
    gender: str = "Female"
) -> Dict[str, Any]:
    """Generates audio via Edge-TTS or Meta MMS-TTS Khmer (offline) with auto fallback"""
    unique_id = str(uuid.uuid4())[:10]
    raw_filename = f"tts_raw_{unique_id}.mp3"
    raw_path = AUDIO_CACHE_DIR / raw_filename

    clean_text = text.strip()
    # Remove special quotes and invisible control characters that can cause Edge-TTS WebSocket drops
    clean_text = re.sub(r'[《》“”"\'…—•\u200b\u200c\ufeff]', ' ', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    if not clean_text:
        clean_text = text.strip() or "..."

    generated_offline = False

    # 1. If explicit MMS offline engine requested, run Meta MMS Khmer
    if engine in ["mms-offline", "offline", "mms"]:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, generate_speech_mms_khmer_sync, clean_text, str(raw_path), gender)
        generated_offline = True
    else:
        # 2. Online Edge-TTS with Auto-Retry & Resilient Connection Handling
        edge_ok = False
        last_error = None

        for attempt in range(4):
            try:
                communicate = edge_tts.Communicate(text=clean_text, voice=voice, rate=rate, pitch=pitch, volume=volume)
                await communicate.save(str(raw_path))
                edge_ok = True
                break
            except Exception as e:
                last_error = e
                # Back off on connection reset or network glitch
                sleep_time = 0.5 * (attempt + 1)
                await asyncio.sleep(sleep_time)

                # Retry with standard rate if rate modulation caused handshake drop
                try:
                    communicate = edge_tts.Communicate(text=clean_text, voice=voice, rate="+0%", pitch="+0Hz", volume=volume)
                    await communicate.save(str(raw_path))
                    edge_ok = True
                    break
                except Exception as e2:
                    last_error = e2

        # 3. If Edge-TTS was forcibly disconnected (WinError 10054 / network drop) and Khmer offline model is available, fallback gracefully
        if not edge_ok:
            if "km-KH" in (voice or "") and is_mms_khmer_available():
                print(f"Notice: Edge-TTS connection closed ({last_error}), switching to local Meta MMS-TTS Khmer offline engine...")
                try:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, generate_speech_mms_khmer_sync, clean_text, str(raw_path), gender)
                    generated_offline = True
                    edge_ok = True
                except Exception as mms_err:
                    print(f"Offline MMS fallback error: {mms_err}")

        if not edge_ok:
            raise RuntimeError(f"Edge-TTS Online voice failed ({last_error}). Check your internet connection or switch to ⚡ Offline mode.")

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
                # Dynamic Lip-Sync Auto-Fit: accelerate tempo up to 1.48x so speech naturally fits the character's speaking window
                tempo = min(duration / target_duration, 1.48)
                if tempo > 1.04:
                    stretched_filename = f"tts_fit_{unique_id}.mp3"
                    stretched_path = AUDIO_CACHE_DIR / stretched_filename
                    if time_stretch_audio(str(raw_path), str(stretched_path), tempo):
                        final_filename = stretched_filename
                        final_path = stretched_path
                        duration = get_audio_duration(str(final_path))
                        # Only clear exceeded if audio actually fits within target slot (+0.2s margin)
                        is_exceeded = (duration > (target_duration + 0.2))
                        effective_speed = round(tempo, 2)

    return {
        "audio_filename": final_filename,
        "audio_url": f"/api/audio/{final_filename}",
        "duration": round(duration, 3),
        "is_duration_exceeded": is_exceeded,
        "speed": effective_speed
    }

async def generate_batch_tts(
    items: Any,
    use_translation: bool = True,
    voice: Optional[str] = None,
    voice_male: str = "km-KH-PisethNeural",
    voice_female: str = "km-KH-SreymomNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
    auto_fit: bool = True,
    engine: str = "edge-tts"
) -> List[SubtitleItem]:
    """Generates TTS for items using their gender profile (Male/Female) with Edge-TTS or Meta MMS Khmer offline"""
    if hasattr(items, "items"):
        req = items
        items = req.items
        use_translation = getattr(req, "use_translation", use_translation)
        voice_male = getattr(req, "voice_male", voice_male)
        voice_female = getattr(req, "voice_female", voice_female)
        rate = getattr(req, "rate", rate)
        pitch = getattr(req, "pitch", pitch)
        volume = getattr(req, "volume", volume)
        auto_fit = getattr(req, "auto_fit", auto_fit)
        engine = getattr(req, "engine", engine) or engine

    # 1. If translation is enabled, ensure any items without translated_text get translated to Khmer first!
    if use_translation:
        untranslated = [
            it for it in items
            if not (it.translated_text and str(it.translated_text).strip())
            and (it.text and str(it.text).strip())
        ]
        if untranslated:
            try:
                from .translator import translate_batch_google_free, translate_batch_nllb_offline
                if engine in ["mms-offline", "offline", "mms"]:
                    print(f"Notice: translating {len(untranslated)} items via Meta NLLB-200 Offline before TTS...")
                    translated = await translate_batch_nllb_offline(items=untranslated, source_lang="auto", target_lang="km")
                else:
                    try:
                        translated = await translate_batch_google_free(
                            items=untranslated,
                            source_lang="auto",
                            target_lang="km"
                        )
                    except Exception:
                        print("Google translate unavailable, falling back to Meta NLLB-200 offline...")
                        translated = await translate_batch_nllb_offline(items=untranslated, source_lang="auto", target_lang="km")

                lookup = {it.id: it.translated_text for it in translated if it.translated_text}
                for it in items:
                    if it.id in lookup and not it.translated_text:
                        it.translated_text = lookup[it.id]
            except Exception as trans_err:
                print(f"Notice: pre-TTS translation error: {trans_err}")

    sem = asyncio.Semaphore(2)

    async def process_item(item: SubtitleItem):
        async with sem:
            # Gentle pacing to prevent Microsoft WebSocket rate-limiting and WinError 10054
            await asyncio.sleep(0.08)

            # Pick voice based on item gender if specific voice not overridden
            selected_voice = voice
            if not selected_voice:
                selected_voice = voice_male if item.gender == "Male" else voice_female

            speech_text = (item.translated_text if (use_translation and item.translated_text) else item.text) or ""

            # Safety fallback: If target voice is Khmer (km-KH) but text has Chinese characters that cause Edge-TTS to abort
            if "km-KH" in (selected_voice or "") and CHINESE_CHAR_REGEX.search(speech_text):
                try:
                    from .translator import translate_text_google_free
                    translated_kh = await translate_text_google_free(speech_text, source_lang="auto", target_lang="km")
                    if translated_kh and translated_kh.strip():
                        speech_text = translated_kh
                        item.translated_text = translated_kh
                except Exception as t_err:
                    print(f"Notice: single fallback translation error: {t_err}")

            if not speech_text.strip():
                item.audio_status = "idle"
                return item

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
                    custom_speed=custom_spd,
                    engine=engine,
                    gender=item.gender or "Female"
                )
                item.audio_url = res["audio_url"]
                item.audio_duration = res["duration"]
                item.base_audio_duration = res["duration"]
                item.audio_start = item.start_time
                item.audio_end = round(item.start_time + res["duration"], 2)
                item.is_duration_exceeded = res["is_duration_exceeded"]
                item.speed = res.get("speed", 1.0)
                item.audio_status = "ready"
                item.audio_engine = "mms-offline" if engine in ["mms-offline", "offline", "mms"] else "edge-tts"
            except Exception as e:
                print(f"Error generating TTS for item #{item.index}: {e}")
                item.audio_status = "error"
            return item

    tasks = [process_item(it.model_copy()) for it in items]
    results = await asyncio.gather(*tasks)

    # Strict Lip-Sync: Ensure each voice starts on time with the character on screen
    for it in results:
        if it.audio_url and it.audio_status == "ready" and it.audio_duration:
            it.audio_start = it.start_time
            it.audio_end = round(it.start_time + it.audio_duration, 2)

    return results

