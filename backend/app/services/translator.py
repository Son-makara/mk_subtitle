import os
import json
import httpx
import asyncio
from typing import List, Optional
from ..models.subtitle import SubtitleItem
from ..config import STORAGE_DIR

LANGUAGE_MAP = {
    "km": "Khmer",
    "en": "English",
    "zh": "Chinese (Simplified)",
    "vi": "Vietnamese",
    "th": "Thai",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
}

async def translate_text_google_free(text: str, source_lang: str = "auto", target_lang: str = "km") -> str:
    """Translates text using Google's public translation endpoint without API key"""
    if not text.strip():
        return ""
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    sl = source_lang if source_lang and source_lang != "auto" else "auto"

    for client_name in ["dict-chrome-ex", "gtx"]:
        try:
            url = "https://translate.googleapis.com/translate_a/single"
            params = {
                "client": client_name,
                "sl": sl,
                "tl": target_lang,
                "dt": "t",
                "q": text
            }
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    translated_segments = [seg[0] for seg in data[0] if seg and seg[0]]
                    if translated_segments:
                        return "".join(translated_segments)
        except Exception:
            continue

    return text

async def translate_batch_google_free(
    items: List[SubtitleItem],
    source_lang: str = "auto",
    target_lang: str = "km"
) -> List[SubtitleItem]:
    """Translates items with rate-limited concurrent calls"""
    sem = asyncio.Semaphore(5)

    async def translate_one(item: SubtitleItem):
        async with sem:
            translated = await translate_text_google_free(item.text, source_lang, target_lang)
            item.translated_text = translated
            return item

    tasks = [translate_one(it.model_copy()) for it in items]
    return await asyncio.gather(*tasks)

def get_candidate_models() -> List[str]:
    base = [
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
        "gemini-flash-latest",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ]
    try:
        settings_path = STORAGE_DIR / "settings.json"
        if settings_path.exists():
            with open(settings_path, "r", encoding="utf-8") as f:
                saved = json.load(f)
                discovered = saved.get("gemini_models", [])
                for sm in reversed(discovered):
                    if sm not in base:
                        base.insert(0, sm)
    except Exception:
        pass
    return base

async def translate_batch_gemini(
    items: List[SubtitleItem],
    source_lang: str = "auto",
    target_lang: str = "km",
    api_key: Optional[str] = None
) -> List[SubtitleItem]:
    """Translates a batch of subtitle items with Gemini for superior contextual awareness"""
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        # Fallback to free Google Translate
        return await translate_batch_google_free(items, source_lang, target_lang)

    target_lang_name = LANGUAGE_MAP.get(target_lang, target_lang)

    # Prepare compact JSON payload
    payload = [{"id": it.id, "text": it.text} for it in items]

    prompt = f"""You are a professional movie and video subtitler.
Translate the following subtitle lines into natural, fluent {target_lang_name}.
Preserve tone, humor, cinematic rhythm, and keep subtitles concise.
Maintain the exact IDs in a valid JSON response array.

Input JSON:
{json.dumps(payload, ensure_ascii=False)}

Respond ONLY with valid JSON in this exact structure:
[
  {{"id": "...", "translated_text": "..."}}
]
"""

    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"}
    }

    candidate_models = get_candidate_models()

    for api_ver in ["v1beta", "v1"]:
        for m in candidate_models:
            try:
                url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{m}:generateContent?key={key}"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, headers=headers, json=body)
                    if resp.status_code == 200:
                        result = resp.json()
                        raw_json = result["candidates"][0]["content"]["parts"][0]["text"]
                        translated_data = json.loads(raw_json)
                        lookup = {entry["id"]: entry["translated_text"] for entry in translated_data if "id" in entry}

                        copied = []
                        for it in items:
                            c = it.model_copy()
                            c.translated_text = lookup.get(c.id, c.text)
                            copied.append(c)
                        return copied
            except Exception as e:
                pass

    print("All Gemini models failed. Falling back to Google free translate.")
    return await translate_batch_google_free(items, source_lang, target_lang)

# ==================== Meta NLLB-200 100% Offline AI Translation ====================

NLLB_LANG_MAP = {
    "km": "khm_Khmr",
    "en": "eng_Latn",
    "zh": "zho_Hans",
    "vi": "vie_Latn",
    "th": "tha_Thai",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "fr": "fra_Latn",
    "es": "spa_Latn",
    "de": "deu_Latn",
    "auto": "eng_Latn"
}

_NLLB_MODEL = None
_NLLB_TOKENIZER = None

def is_nllb_available() -> bool:
    """Checks if NLLB-200 model is cached locally on disk"""
    try:
        import os
        cache_dir = os.path.expanduser(r"~/.cache/huggingface/hub/models--facebook--nllb-200-distilled-600M")
        return os.path.exists(cache_dir)
    except Exception:
        return False

def get_nllb_model():
    """Lazy-loads Meta NLLB-200 distilled 600M model onto CPU or GPU"""
    global _NLLB_MODEL, _NLLB_TOKENIZER
    if _NLLB_MODEL is None or _NLLB_TOKENIZER is None:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        model_id = "facebook/nllb-200-distilled-600M"
        print("Loading Meta NLLB-200 Offline Translation model...")
        _NLLB_TOKENIZER = AutoTokenizer.from_pretrained(model_id)
        _NLLB_MODEL = AutoModelForSeq2SeqLM.from_pretrained(model_id)
    return _NLLB_TOKENIZER, _NLLB_MODEL

def translate_batch_nllb_sync(
    texts: List[str],
    source_lang: str = "auto",
    target_lang: str = "km"
) -> List[str]:
    """Translates a batch of texts using NLLB-200 completely offline"""
    if not texts:
        return []
    import torch
    tokenizer, model = get_nllb_model()
    src_code = NLLB_LANG_MAP.get(source_lang, "eng_Latn")
    tgt_code = NLLB_LANG_MAP.get(target_lang, "khm_Khmr")

    tokenizer.src_lang = src_code
    forced_bos = tokenizer.convert_tokens_to_ids(tgt_code)

    results = []
    chunk_size = 8
    for i in range(0, len(texts), chunk_size):
        chunk = [t.strip() if t else "" for t in texts[i:i + chunk_size]]
        inputs = tokenizer(chunk, return_tensors="pt", padding=True, truncation=True, max_length=256)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                forced_bos_token_id=forced_bos,
                max_length=256
            )
        decoded = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        results.extend(decoded)
    return results

async def translate_batch_nllb_offline(
    items: List[SubtitleItem],
    source_lang: str = "auto",
    target_lang: str = "km"
) -> List[SubtitleItem]:
    """Asynchronous wrapper for NLLB-200 offline translation"""
    loop = asyncio.get_event_loop()
    texts = [it.text for it in items]
    translated_texts = await loop.run_in_executor(None, translate_batch_nllb_sync, texts, source_lang, target_lang)

    copied = []
    for it, trans in zip(items, translated_texts):
        c = it.model_copy()
        c.translated_text = trans or c.text
        copied.append(c)
    return copied
