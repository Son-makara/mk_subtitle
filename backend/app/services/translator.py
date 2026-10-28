import os
import json
import httpx
import asyncio
from typing import List, Optional
from ..models.subtitle import SubtitleItem

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
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": source_lang if source_lang != "auto" else "auto",
            "tl": target_lang,
            "dt": "t",
            "q": text
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                translated_segments = [seg[0] for seg in data[0] if seg[0]]
                return "".join(translated_segments)
    except Exception as e:
        print(f"Error in google free translation: {e}")
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

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"}
    }

    try:
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
        print(f"Gemini translation failed: {e}. Falling back to Google free translate.")

    return await translate_batch_google_free(items, source_lang, target_lang)

