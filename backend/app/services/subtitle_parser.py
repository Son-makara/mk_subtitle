import re
import uuid
from typing import List, Dict, Any, Tuple, Optional
from ..models.subtitle import SubtitleItem

def seconds_to_srt_time(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

def seconds_to_vtt_time(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"

def seconds_to_ass_time(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        secs += 1
        centis = 0
    return f"{hrs}:{mins:02d}:{secs:02d}.{centis:02d}"

def time_to_seconds(time_str: str) -> float:
    time_str = time_str.strip().replace(",", ".")
    parts = time_str.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(time_str)

def parse_srt(content: str) -> List[SubtitleItem]:
    items: List[SubtitleItem] = []
    # Normalize line endings
    content = content.replace("\r\n", "\n").replace("\r", "\n").strip()
    blocks = re.split(r"\n\s*\n", content)
    
    idx_counter = 1
    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        
        # Check if first line is index or timestamp
        time_line_idx = 0
        if "-->" not in lines[0] and len(lines) > 1 and "-->" in lines[1]:
            time_line_idx = 1
        
        if "-->" not in lines[time_line_idx]:
            continue
            
        time_part = lines[time_line_idx]
        times = time_part.split("-->")
        start_sec = time_to_seconds(times[0].strip())
        end_sec = time_to_seconds(times[1].strip().split()[0])
        
        text = "\n".join(lines[time_line_idx + 1:])
        if not text:
            continue
            
        items.append(
            SubtitleItem(
                id=str(uuid.uuid4())[:8],
                index=idx_counter,
                start_time=round(start_sec, 3),
                end_time=round(end_sec, 3),
                text=text,
                translated_text=None,
                speaker="Narrator",
            )
        )
        idx_counter += 1
        
    return items

def parse_vtt(content: str) -> List[SubtitleItem]:
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    if content.startswith("WEBVTT"):
        content = re.sub(r"^WEBVTT.*?\n\n", "", content, flags=re.DOTALL)
    return parse_srt(content)

def parse_subtitles_auto(content: str) -> List[SubtitleItem]:
    content_stripped = content.strip()
    if "WEBVTT" in content_stripped[:30]:
        return parse_vtt(content)
    elif "[Events]" in content_stripped or "[Script Info]" in content_stripped:
        return parse_ass(content)
    else:
        # Default to SRT style parser
        return parse_srt(content)

def parse_ass(content: str) -> List[SubtitleItem]:
    items: List[SubtitleItem] = []
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    events_found = False
    format_indices = {}
    
    idx_counter = 1
    for line in lines:
        line_str = line.strip()
        if line_str.startswith("[Events]"):
            events_found = True
            continue
        if events_found and line_str.startswith("Format:"):
            fields = [f.strip().lower() for f in line_str.replace("Format:", "").split(",")]
            format_indices = {field: idx for idx, field in enumerate(fields)}
            continue
        if events_found and line_str.startswith("Dialogue:"):
            parts = [p.strip() for p in line_str.replace("Dialogue:", "", 1).split(",", maxsplit=len(format_indices)-1)]
            start_idx = format_indices.get("start", 1)
            end_idx = format_indices.get("end", 2)
            text_idx = format_indices.get("text", len(parts) - 1)
            
            start_sec = time_to_seconds(parts[start_idx])
            end_sec = time_to_seconds(parts[end_idx])
            raw_text = parts[text_idx]
            # Strip ASS override tags like {\an8}
            clean_text = re.sub(r"\{.*?\}", "", raw_text).replace(r"\N", "\n").replace(r"\n", "\n")
            
            items.append(
                SubtitleItem(
                    id=str(uuid.uuid4())[:8],
                    index=idx_counter,
                    start_time=round(start_sec, 3),
                    end_time=round(end_sec, 3),
                    text=clean_text.strip(),
                    speaker="Narrator",
                )
            )
            idx_counter += 1
            
    return items

def export_srt(items: List[SubtitleItem], use_translated: bool = False) -> str:
    output_lines = []
    for idx, item in enumerate(items, 1):
        txt = (item.translated_text if (use_translated and item.translated_text) else item.text) or ""
        output_lines.append(str(idx))
        output_lines.append(f"{seconds_to_srt_time(item.start_time)} --> {seconds_to_srt_time(item.end_time)}")
        output_lines.append(txt.strip())
        output_lines.append("")
    return "\n".join(output_lines)

def export_vtt(items: List[SubtitleItem], use_translated: bool = False) -> str:
    output_lines = ["WEBVTT", ""]
    for idx, item in enumerate(items, 1):
        txt = (item.translated_text if (use_translated and item.translated_text) else item.text) or ""
        output_lines.append(str(idx))
        output_lines.append(f"{seconds_to_vtt_time(item.start_time)} --> {seconds_to_vtt_time(item.end_time)}")
        output_lines.append(txt.strip())
        output_lines.append("")
    return "\n".join(output_lines)

def export_ass(
    items: List[SubtitleItem],
    use_translated: bool = False,
    style_preset: str = "modern_yellow",
    font_name: Optional[str] = None,
    font_size: Optional[int] = None,
    primary_color: Optional[str] = None,
    outline_color: Optional[str] = None,
    alignment: int = 2,
    margin_v: Optional[int] = None,
    play_res_x: int = 1920,
    play_res_y: int = 1080
) -> str:
    # ASS Header with responsive resolution (supports both 16:9 landscape and 9:16 portrait)
    header = f"""[Script Info]
Title: mk_subtitle Auto Generated
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {play_res_x}
PlayResY: {play_res_y}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
"""
    # Map web/display font names to exact TrueType font family names recognized by Windows DirectWrite/GDI
    font_map = {
        "kantumruy pro": "Kantumruy",
        "kantumruy": "Kantumruy",
        "khmer os siemreap": "Khmer OS Siemreap",
        "khmer os battambang": "Khmer OS Battambang",
        "khmer os muol": "Khmer OS Muol",
        "khmer os content": "Khmer OS Content",
        "leelawadee ui": "Leelawadee UI",
        "segoe ui": "Segoe UI"
    }
    raw_font = (font_name or "").strip()
    chosen_font = font_map.get(raw_font.lower(), raw_font or "Kantumruy")
    
    # Scale default font size and margins proportionally to ASS canvas height (play_res_y)
    is_portrait = play_res_y > play_res_x
    height_scale = play_res_y / 1080.0
    portrait_boost = 1.15 if is_portrait else 1.0

    raw_font_size = font_size if (font_size and font_size > 0) else 24
    if raw_font_size > 60:
        # User supplied a raw ASS point size directly
        calculated_size = int(raw_font_size * height_scale)
    else:
        # Scale frontend size (16-64) to ASS canvas height with Khmer typography compensation
        calculated_size = int(raw_font_size * 2.6 * height_scale * portrait_boost)

    size_my = calculated_size
    p_col_my = primary_color if primary_color else "&H0000FFFF"
    o_col_my = outline_color if outline_color else "&H00000000"

    size_bd = calculated_size
    p_col_bd = primary_color if primary_color else "&H00FFFFFF"
    o_col_bd = outline_color if outline_color else "&H00000000"

    size_by = calculated_size
    p_col_by = primary_color if primary_color else "&H0000FFFF"
    o_col_by = outline_color if outline_color else "&H00000000"

    size_cw = calculated_size
    p_col_cw = primary_color if primary_color else "&H00FFFFFF"
    o_col_cw = outline_color if outline_color else "&H00000000"

    raw_margin = margin_v if (margin_v is not None and margin_v > 0) else (90 if is_portrait else 55)
    actual_margin_v = int(raw_margin * height_scale)
    actual_align = alignment if alignment in [2, 5, 8] else 2

    outline_val = max(2, int(3.5 * height_scale * (1.15 if is_portrait else 1.0)))
    shadow_val = max(1, int(2.0 * height_scale))
    margin_lr = int(40 * height_scale)

    # Style definitions
    # ASS Hex colors: &HAABBGGRR (Alpha, Blue, Green, Red)
    if style_preset == "modern_yellow":
        style_line = f"Style: Default,{chosen_font},{size_my},{p_col_my},&H000000FF,{o_col_my},&H80000000,-1,0,0,0,100,100,0,0,1,{outline_val},{shadow_val},{actual_align},{margin_lr},{margin_lr},{actual_margin_v},1"
    elif style_preset == "box_dark":
        style_line = f"Style: Default,{chosen_font},{size_bd},{p_col_bd},&H000000FF,{o_col_bd},&H90000000,-1,0,0,0,100,100,0,0,3,{max(2, outline_val - 1)},1,{actual_align},{int(margin_lr * 0.75)},{int(margin_lr * 0.75)},{actual_margin_v},1"
    elif style_preset == "box_yellow":
        style_line = f"Style: Default,{chosen_font},{size_by},{p_col_by},&H000000FF,{o_col_by},&H90000000,-1,0,0,0,100,100,0,0,3,{max(2, outline_val - 1)},1,{actual_align},{int(margin_lr * 0.75)},{int(margin_lr * 0.75)},{actual_margin_v},1"
    else: # classic_white
        style_line = f"Style: Default,{chosen_font},{size_cw},{p_col_cw},&H000000FF,{o_col_cw},&H60000000,-1,0,0,0,100,100,0,0,1,{outline_val},{shadow_val},{actual_align},{margin_lr},{margin_lr},{actual_margin_v},1"

    body = [header, style_line, "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    for item in items:
        txt = (item.translated_text if (use_translated and item.translated_text) else item.text) or ""
        escaped_txt = txt.replace("\n", r"\N").replace("\r", "")
        start_ass = seconds_to_ass_time(item.start_time)
        end_ass = seconds_to_ass_time(item.end_time)
        body.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{escaped_txt}")
        
    return "\n".join(body)

def auto_fix_overlaps(items: List[SubtitleItem], min_gap: float = 0.05) -> List[SubtitleItem]:
    """Ensures no subtitle start time is less than the previous end time + min_gap"""
    fixed = []
    for i, it in enumerate(items):
        item = it.model_copy()
        if i > 0:
            prev = fixed[i-1]
            if item.start_time < prev.end_time:
                # If overlap, adjust previous end time
                prev.end_time = max(prev.start_time + 0.2, item.start_time - min_gap)
        if item.end_time <= item.start_time:
            item.end_time = round(item.start_time + 1.0, 3)
        fixed.append(item)
    return fixed
