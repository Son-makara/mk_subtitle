import os
import uuid
import base64
import urllib.parse
from typing import Optional, Dict, Any, List
import httpx
from pathlib import Path
from ..config import UPLOADS_DIR, STORAGE_DIR

CANDIDATE_GEMINI_MODELS = [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-latest",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-pro"
]

def get_candidate_gemini_models() -> List[str]:
    base = list(CANDIDATE_GEMINI_MODELS)
    try:
        settings_path = STORAGE_DIR / "settings.json"
        if settings_path.exists():
            import json
            with open(settings_path, "r", encoding="utf-8") as f:
                saved = json.load(f)
                discovered = saved.get("gemini_models", [])
                for sm in reversed(discovered):
                    if sm not in base:
                        base.insert(0, sm)
    except Exception:
        pass
    return base

STYLE_PROMPTS = {
    "cinematic": "cinematic movie scene, highly detailed, dramatic atmospheric lighting, 8k resolution, photorealistic",
    "action": "epic action blockbuster movie scene, cinematic explosion, fire and smoke, heroic atmosphere, dynamic angle, 8k",
    "horror": "dark foggy terrifying horror movie scene, eerie green and black shadows, mystical mist, cinematic thriller mood, 8k",
    "romance": "romantic cinematic drama scene, golden hour sunset, soft warm glow, emotional depth, photorealistic 8k",
    "cyberpunk": "futuristic cyberpunk metropolis, glowing neon reflections, rain soaked dark street, high tech sci-fi, 8k",
    "khmer_myth": "ancient Angkor Wat stone temple, mystical golden god rays, ancient Cambodian jungle ruins, epic myth, 8k",
    "anime": "high quality anime style cinematic background, Makoto Shinkai lighting, vibrant colors, detailed scenery"
}

GENRE_KHMER_TEMPLATES = {
    "horror": {
        "titles": ["អាថ៌កំបាំងភូមិព្រាយ", "វិញ្ញាណសងសឹក", "យប់រន្ធត់ក្នុងព្រៃជ្រៅ", "ប្រាសាទខ្មោចលង"],
        "subtitles": ["កុំមើលម្នាក់ឯង! រន្ធត់ញាប់ញ័រ", "សាច់រឿងព្រឺព្រួចតាំងពីដើមដល់ចប់", "រឿងពិតមិនគួរជឿ!"]
    },
    "action": {
        "titles": ["ចម្បាំងមហាសាល 2026", "វីរបុរសគ្មានស្រមោល", "បេសកកម្មរំលត់ភ្លើងគំនុំ", "អ្នកប្រយុទ្ធដែកថែប"],
        "subtitles": ["ឈុតឆាកវាយប្រហារល្អមើលជក់ចិត្ត!", "សកម្មភាពបាញ់ប្រហារកក្រើកផែនដី", "រឿងពេញ 1080p និយាយខ្មែរ"]
    },
    "romance": {
        "titles": ["ស្នេហ៍ឆ្លងភពសែនឆ្ងាយ", "ខ្សែជីវិតនិងទឹកភ្នែក", "ស្នេហ៍ពិតក្នុងបេះដូង", "រង់ចាំមនុស្សម្នាក់"],
        "subtitles": ["សម្រាយរឿងភាគមនោសញ្ចេតនាកម្សត់", "រឿងភាគល្បីប្រចាំឆ្នាំ ហាមរំលង", "និយាយខ្មែរច្បាស់ល្អ"]
    },
    "cyberpunk": {
        "titles": ["ពិភពលោកឆ្នាំ ២០៩៩", "សង្គ្រាមមនុស្សយន្ត", "បេសកកម្មឆ្លងចក្រវាល", "មេរោគបំផ្លាញផែនដី"],
        "subtitles": ["បែបវិទ្យាសាស្ត្រទំនើបអស្ចារ្យ", "ឈុតឆាកបច្ចេកវិទ្យាកំពូល", "រឿងពេញ HD"]
    },
    "general": {
        "titles": ["សម្រាយសាច់រឿងពិសេស", "រឿងពេញ HD និយាយខ្មែរ", "ឈុតឆាកដែលកម្របានឃើញ", "រឿងភាគថ្មីចុងក្រោយ"],
        "subtitles": ["ល្អមើលជក់ចិត្ត ហាមរំលង!", "សម្រាយលម្អិតចប់ចុងចប់ដើម", "ភាគថ្មីទើបចេញ"]
    }
}

async def generate_ai_cover_image(
    prompt: str,
    aspect_ratio: str = "16:9",
    style: str = "cinematic",
    gemini_api_key: Optional[str] = None,
    reference_image_b64: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a high-resolution cover backdrop image.
    Supports:
    1. Google Imagen 3 (via Gemini API key if provided)
    2. Multimodal Image-to-Image with Gemini Vision
    3. Free Public SANA / Pollinations Engine (zero setup, no API key required)
    """
    clean_prompt = prompt.strip() if prompt else "cinematic movie landscape"
    style_suffix = STYLE_PROMPTS.get(style, STYLE_PROMPTS["cinematic"])
    full_prompt = f"{clean_prompt}, {style_suffix}"

    # Target Dimensions
    if aspect_ratio == "9:16":
        width, height = 576, 1024
        imagen_ratio = "9:16"
    elif aspect_ratio == "1:1":
        width, height = 1024, 1024
        imagen_ratio = "1:1"
    else:
        width, height = 1024, 576
        imagen_ratio = "16:9"

    key = gemini_api_key or os.getenv("GEMINI_API_KEY")

    # If reference image is provided and Gemini key is available, use Gemini Vision to blend subject + prompt
    if reference_image_b64 and key:
        try:
            clean_b64 = reference_image_b64.split(",")[-1] if "," in reference_image_b64 else reference_image_b64
            vision_body = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": (
                                    f"You are a master movie poster artist. Analyze this reference image carefully: "
                                    f"Identify the characters (gender, appearance, stylish clothing, hair), atmosphere, "
                                    f"and lighting. Then create a vivid, descriptive prompt that retains the character appearances "
                                    f"and daylight mood from this image while following: '{clean_prompt}'. "
                                    f"Return ONLY the enhanced prompt string without commentary or markdown."
                                )
                            },
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": clean_b64
                                }
                            }
                        ]
                    }
                ]
            }
            found = False
            for api_ver in ["v1beta", "v1"]:
                if found:
                    break
                for m in get_candidate_gemini_models():
                    try:
                        vision_url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{m}:generateContent?key={key}"
                        async with httpx.AsyncClient(timeout=25.0) as client:
                            v_res = await client.post(vision_url, json=vision_body)
                            if v_res.status_code == 200:
                                v_data = v_res.json()
                                enhanced = v_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                                if enhanced:
                                    full_prompt = f"{enhanced}, {style_suffix}"
                                    print(f"Gemini Vision ({m} on {api_ver}) enhanced prompt: {full_prompt[:120]}...")
                                    found = True
                                    break
                    except Exception as e:
                        pass
        except Exception as e:
            print(f"Notice: Gemini Vision reference image error: {e}")

    # If reference image is provided without Gemini key, save reference image locally and adjust prompt
    if reference_image_b64 and not key:
        try:
            clean_b64 = reference_image_b64.split(",")[-1] if "," in reference_image_b64 else reference_image_b64
            ref_bytes = base64.b64decode(clean_b64)
            ref_filename = f"ref_input_{uuid.uuid4().hex[:8]}.jpg"
            with open(UPLOADS_DIR / ref_filename, "wb") as f_ref:
                f_ref.write(ref_bytes)
            full_prompt = f"remastered cinematic movie scene based on original character, {clean_prompt}, {style_suffix}"
        except Exception as e:
            print(f"Notice: Saving reference image error: {e}")

    # --- Engine 1: Google Imagen 3 if Gemini API Key is provided ---
    key = gemini_api_key or os.getenv("GEMINI_API_KEY")
    if key:
        try:
            imagen_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={key}"
            payload = {
                "instances": [{"prompt": full_prompt}],
                "parameters": {
                    "sampleCount": 1,
                    "aspectRatio": imagen_ratio,
                    "outputMimeType": "image/jpeg"
                }
            }
            async with httpx.AsyncClient(timeout=40.0) as client:
                res = await client.post(imagen_url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    preds = data.get("predictions", [])
                    if preds and "bytesBase64Encoded" in preds[0]:
                        b64_bytes = preds[0]["bytesBase64Encoded"]
                        img_data = base64.b64decode(b64_bytes)

                        # Save to uploads dir
                        filename = f"ai_cover_{uuid.uuid4().hex[:10]}.jpg"
                        filepath = UPLOADS_DIR / filename
                        with open(filepath, "wb") as f:
                            f.write(img_data)

                        data_url = f"data:image/jpeg;base64,{b64_bytes}"
                        return {
                            "status": "success",
                            "engine": "Google Imagen 3 (Ultra HD)",
                            "filename": filename,
                            "url": f"/api/video/{filename}",
                            "data_url": data_url
                        }
        except Exception as e:
            print(f"Notice: Google Imagen 3 generation error: {e}. Falling back to Free Engine.")

    # --- Engine 2: 100% Free Public AI Engine (SANA / Pollinations) ---
    encoded = urllib.parse.quote(full_prompt)
    pollinations_urls = [
        f"https://image.pollinations.ai/prompt/{encoded}?model=sana&width={width}&height={height}&nologo=true",
        f"https://image.pollinations.ai/prompt/{encoded}?nologo=true"
    ]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    for url in pollinations_urls:
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    img_bytes = resp.content
                    b64_str = base64.b64encode(img_bytes).decode("utf-8")

                    filename = f"ai_cover_{uuid.uuid4().hex[:10]}.jpg"
                    filepath = UPLOADS_DIR / filename
                    with open(filepath, "wb") as f:
                        f.write(img_bytes)

                    data_url = f"data:image/jpeg;base64,{b64_str}"
                    return {
                        "status": "success",
                        "engine": "Free SANA AI Engine",
                        "filename": filename,
                        "url": f"/api/video/{filename}",
                        "data_url": data_url
                    }
        except Exception as err:
            print(f"Notice: Free engine attempt error on {url}: {err}")

    raise RuntimeError("AI image generation temporarily unavailable. Please check your network or try a different prompt.")

async def suggest_khmer_titles(
    prompt: str,
    gemini_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Suggests viral, click-worthy Khmer movie titles and subtitle hooks based on prompt.
    """
    key = gemini_api_key or os.getenv("GEMINI_API_KEY")
    if key:
        try:
            sys_prompt = f"""You are an expert Cambodian movie marketing specialist and YouTube title strategist.
Based on the following topic or prompt: "{prompt}"
Generate 3 dramatic, high-CTR Khmer movie titles (ចំណងជើងរឿង) and 2 compelling subtitle hooks in Khmer (ឃ្លាទាក់ទាញ).
Return strictly valid JSON in this exact structure:
{{
  "titles": ["ចំណងជើង១", "ចំណងជើង២", "ចំណងជើង៣"],
  "subtitles": ["ឃ្លាទាក់ទាញ១", "ឃ្លាទាក់ទាញ២"]
}}"""
            body = {
                "contents": [{"parts": [{"text": sys_prompt}]}],
                "generationConfig": {"temperature": 0.7, "response_mime_type": "application/json"}
            }
            for api_ver in ["v1beta", "v1"]:
                for m in get_candidate_gemini_models():
                    try:
                        url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{m}:generateContent?key={key}"
                        async with httpx.AsyncClient(timeout=20.0) as client:
                            res = await client.post(url, json=body)
                            if res.status_code == 200:
                                import json
                                text_resp = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                                return json.loads(text_resp)
                    except Exception as m_err:
                        pass
        except Exception as e:
            print(f"Notice: Gemini title suggestion fallback: {e}")

    # Fallback to smart rule-based Khmer templates
    p_lower = (prompt or "").lower()
    if any(k in p_lower for k in ["ghost", "horror", "scary", "demon", "monster", "temple", "dark", "ខ្មោច", "ព្រាយ"]):
        genre = "horror"
    elif any(k in p_lower for k in ["action", "war", "battle", "gun", "fight", "explosion", "ប្រយុទ្ធ", "វាយ"]):
        genre = "action"
    elif any(k in p_lower for k in ["love", "romance", "girl", "couple", "kiss", "sunset", "ស្នេហ៍", "ស្នេហា"]):
        genre = "romance"
    elif any(k in p_lower for k in ["robot", "cyber", "future", "space", "alien"]):
        genre = "cyberpunk"
    else:
        genre = "general"

    return GENRE_KHMER_TEMPLATES.get(genre, GENRE_KHMER_TEMPLATES["general"])

async def extract_and_translate_poster_title(
    image_b64: str,
    gemini_api_key: Optional[str] = None,
    custom_title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyzes an uploaded movie poster or video screenshot containing Chinese/foreign title text.
    1. Uses Gemini Vision to read and identify the original title text and series name.
    2. Translates and adapts the title into high-CTR, natural Khmer movie titles and subtitle hooks.
    3. Falls back gracefully to free translation if custom_title is supplied or if no Gemini key is provided.
    """
    if custom_title and custom_title.strip():
        try:
            from .translator import translate_text_google_free
            clean_trans = await translate_text_google_free(custom_title.strip(), "auto", "km")
            c = clean_trans.strip()
            v1 = c
            v2 = c.replace("!", "").strip() + "!" if not c.endswith("!") else c.replace("!", "").strip()
            v3 = f"រឿង៖ {c.replace('!', '').strip()}"
            titles = []
            for t in [v1, v2, v3]:
                if t and t not in titles:
                    titles.append(t)
            return {
                "status": "success",
                "detected_original_title": custom_title.strip(),
                "detected_language": "Chinese / Foreign",
                "english_title": "",
                "story_summary": f"Translated from '{custom_title.strip()}'",
                "khmer_titles": titles[:3],
                "khmer_subtitles": [
                    "សម្រាយសាច់រឿងពេញ 1080p និយាយខ្មែរ",
                    "ភាគ ០១ [ចប់] ល្អមើលជក់ចិត្ត ហាមរំលង!"
                ],
                "suggested_font_style": "koulen"
            }
        except Exception as e:
            print(f"Notice: Google Free translation error: {e}")

    if not image_b64:
        raise ValueError("No image data provided for poster analysis.")

    clean_b64 = image_b64.split(",")[-1] if "," in image_b64 else image_b64
    
    mime_type = "image/jpeg"
    if "data:image/png" in image_b64:
        mime_type = "image/png"
    elif "data:image/webp" in image_b64:
        mime_type = "image/webp"

    key = gemini_api_key or os.getenv("GEMINI_API_KEY")

    if key:
        try:
            sys_prompt = """You are an elite Asian cinema localization expert and Cambodian movie recap title strategist.
Analyze the provided movie/drama/anime poster or video frame carefully:
1. Detect and read all title text visible on the image (especially Chinese characters 汉字, Korean, Japanese, or English).
2. If this is a known movie, TV drama, or anime, identify the exact series name in its original language and English (e.g. 斗破苍穹 -> Battle Through the Heavens, 斗罗大陆 -> Soul Land, 庆余年 -> Joy of Life, 狂飙 -> The Knockout).
3. Translate and creatively adapt this story title into 3 captivating, fluent Khmer movie titles (ចំណងជើងរឿងខ្មែរ) that sound authentic, dramatic, and high-CTR for Cambodian YouTube/TikTok movie recap channels (using authentic movie vocabulary like ដីគោក..., សមរភូមិ..., វីរបុរស..., គំនុំ..., ពិភព..., ជីវិតថ្មី...).
4. Create 2 irresistible subtitle hooks in Khmer (ឃ្លាទាក់ទាញ/សម្រាយរឿង, e.g. "សម្រាយសាច់រឿងពេញ 1080p និយាយខ្មែរ", "ភាគ ០១ [ចប់] ល្អមើលជក់ចិត្ត ហាមរំលង!").

Return STRICT JSON ONLY without markdown fences or additional explanation:
{
  "detected_original_title": "<Original title found on image, e.g. 斗破苍穹 or 庆余年>",
  "detected_language": "<e.g. Chinese (Simplified), Korean, Japanese, English>",
  "english_title": "<e.g. Battle Through the Heavens>",
  "story_summary": "<1-line overview of the genre and plot>",
  "khmer_titles": [
    "<Creative Khmer Title 1>",
    "<Creative Khmer Title 2>",
    "<Creative Khmer Title 3>"
  ],
  "khmer_subtitles": [
    "<Khmer Subtitle Hook 1>",
    "<Khmer Subtitle Hook 2>"
  ],
  "suggested_font_style": "koulen"
}"""
            vision_body = {
                "contents": [
                    {
                        "parts": [
                            {"text": sys_prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": clean_b64
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.4,
                    "response_mime_type": "application/json"
                }
            }
            for api_ver in ["v1beta", "v1"]:
                for m in get_candidate_gemini_models():
                    try:
                        vision_url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{m}:generateContent?key={key}"
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            res = await client.post(vision_url, json=vision_body)
                            if res.status_code == 200:
                                data = res.json()
                                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                                if raw_text.startswith("```"):
                                    raw_text = raw_text.strip("`")
                                    if raw_text.startswith("json"):
                                        raw_text = raw_text[4:].strip()
                                import json
                                parsed = json.loads(raw_text)
                                parsed["status"] = "success"
                                return parsed
                    except Exception as m_err:
                        pass
        except Exception as e:
            print(f"Notice: Gemini Vision poster analysis error: {e}")

    # Fallback when no Gemini key is provided or Gemini call fails:
    return {
        "status": "partial",
        "detected_original_title": "Original Poster Detected",
        "detected_language": "Chinese / Foreign",
        "english_title": "Asian Drama / Movie",
        "story_summary": "Original poster loaded. For 100% automatic OCR text reading, please connect your Gemini API key in Settings.",
        "khmer_titles": [
            "សមរភូមិមហាសាល ២០២៦",
            "ជីវិតថ្មីនៃអ្នកក្លាហាន",
            "រឿងភាគល្បីប្រចាំឆ្នាំ និយាយខ្មែរ"
        ],
        "khmer_subtitles": [
            "សម្រាយសាច់រឿងពេញ 1080p និយាយខ្មែរ",
            "ភាគ ០១ [ចប់] ល្អមើលជក់ចិត្ត ហាមរំលង!"
        ],
        "suggested_font_style": "koulen",
        "notice": "Tip: Enter your free Gemini API key in Settings for 100% automatic reading of Chinese poster characters!"
    }
