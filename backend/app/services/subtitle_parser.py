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
    play_res_y: int = 1080,
    enable_episode_badge: bool = False,
    episode_badge_text: Optional[str] = None,
    episode_badge_position: str = "top_left",
    episode_badge_style: str = "glass_pill",
    episode_badge_font_size: int = 22,
    episode_badge_duration: str = "always",
    enable_text_watermark: bool = False,
    text_watermark_text: Optional[str] = None,
    text_watermark_position: str = "top_right",
    text_watermark_style: str = "shadow",
    text_watermark_font_size: int = 18,
    text_watermark_opacity: float = 0.8,
    text_watermark_color: str = "&H00FFFFFF",
    watermark_auto_move: bool = False,
    watermark_move_interval: int = 30,
    watermark_move_mode: str = "corner_rotate",
    video_duration: float = 36000.0
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
    styles = []
    if style_preset == "modern_yellow":
        styles.append(f"Style: Default,{chosen_font},{size_my},{p_col_my},&H000000FF,{o_col_my},&H80000000,-1,0,0,0,100,100,0,0,1,{outline_val},{shadow_val},{actual_align},{margin_lr},{margin_lr},{actual_margin_v},1")
    elif style_preset == "box_dark":
        styles.append(f"Style: Default,{chosen_font},{size_bd},{p_col_bd},&H000000FF,{o_col_bd},&H90000000,-1,0,0,0,100,100,0,0,3,{max(2, outline_val - 1)},1,{actual_align},{int(margin_lr * 0.75)},{int(margin_lr * 0.75)},{actual_margin_v},1")
    elif style_preset == "box_yellow":
        styles.append(f"Style: Default,{chosen_font},{size_by},{p_col_by},&H000000FF,{o_col_by},&H90000000,-1,0,0,0,100,100,0,0,3,{max(2, outline_val - 1)},1,{actual_align},{int(margin_lr * 0.75)},{int(margin_lr * 0.75)},{actual_margin_v},1")
    else: # classic_white
        styles.append(f"Style: Default,{chosen_font},{size_cw},{p_col_cw},&H000000FF,{o_col_cw},&H60000000,-1,0,0,0,100,100,0,0,1,{outline_val},{shadow_val},{actual_align},{margin_lr},{margin_lr},{actual_margin_v},1")

    # Tool 5: Dynamic Episode Badge Style Definition
    if enable_episode_badge and episode_badge_text:
        badge_align = 7  # default top-left
        if episode_badge_position == "top_right":
            badge_align = 9
        elif episode_badge_position == "top_center":
            badge_align = 8
        elif episode_badge_position == "bottom_left":
            badge_align = 1
        elif episode_badge_position == "bottom_right":
            badge_align = 3
        elif episode_badge_position == "bottom_center":
            badge_align = 2

        raw_badge_size = episode_badge_font_size if (episode_badge_font_size and episode_badge_font_size > 0) else 22
        calc_badge_size = int(raw_badge_size * 2.2 * height_scale * portrait_boost)
        b_margin_lr = int(35 * height_scale)
        b_margin_v = int(25 * height_scale)

        if episode_badge_style == "cinema_red":
            # Vivid cinema crimson box with crisp white text
            styles.append(f"Style: EpisodeBadge,{chosen_font},{calc_badge_size},&H00FFFFFF,&H000000FF,&H001818B8,&H701515B0,-1,0,0,0,100,100,0,0,3,4,1,{badge_align},{b_margin_lr},{b_margin_lr},{b_margin_v},1")
        elif episode_badge_style == "gold_badge":
            # Amber gold box with bold dark text
            styles.append(f"Style: EpisodeBadge,{chosen_font},{calc_badge_size},&H000F172A,&H000000FF,&H0000C8FF,&H5000C8FF,-1,0,0,0,100,100,0,0,3,4,1,{badge_align},{b_margin_lr},{b_margin_lr},{b_margin_v},1")
        elif episode_badge_style == "dark_box":
            # Yellow text in high-contrast solid dark container
            styles.append(f"Style: EpisodeBadge,{chosen_font},{calc_badge_size},&H0000FFFF,&H000000FF,&H00000000,&H85000000,-1,0,0,0,100,100,0,0,3,4,1,{badge_align},{b_margin_lr},{b_margin_lr},{b_margin_v},1")
        else: # glass_pill
            # Clean white text in semi-transparent smoked glass pill
            styles.append(f"Style: EpisodeBadge,{chosen_font},{calc_badge_size},&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,3,4,1,{badge_align},{b_margin_lr},{b_margin_lr},{b_margin_v},1")

    # Tool 6: Text Watermark Style Definition
    if enable_text_watermark and text_watermark_text:
        raw_wm_size = text_watermark_font_size if (text_watermark_font_size and text_watermark_font_size > 0) else 18
        calc_wm_size = int(raw_wm_size * 2.2 * height_scale * portrait_boost)
        wm_margin_lr = int(35 * height_scale)
        wm_margin_v = int(25 * height_scale)

        # Alpha channel: 00 is opaque, FF is transparent
        op = max(0.1, min(float(text_watermark_opacity if text_watermark_opacity is not None else 0.8), 1.0))
        alpha_val = max(0, min(255, int((1.0 - op) * 255)))
        alpha_hex = f"{alpha_val:02X}"

        # Color handling (convert #FFFFFF to &HAABBGGRR)
        primary_col = f"&H{alpha_hex}FFFFFF"
        if text_watermark_color:
            c = text_watermark_color.strip()
            if c.startswith("#") and len(c) == 7:
                r = c[1:3]
                g = c[3:5]
                b = c[5:7]
                primary_col = f"&H{alpha_hex}{b}{g}{r}"
            elif c.startswith("&H"):
                primary_col = f"&H{alpha_hex}{c[-6:]}"

        outline_alpha = min(255, alpha_val + 20)
        box_alpha = min(255, alpha_val + 40)

        if text_watermark_style == "pill":
            styles.append(f"Style: TextWatermark,{chosen_font},{calc_wm_size},{primary_col},&H000000FF,&H{outline_alpha:02X}000000,&H{box_alpha:02X}000000,-1,0,0,0,100,100,0,0,3,3,1,7,{wm_margin_lr},{wm_margin_lr},{wm_margin_v},1")
        elif text_watermark_style == "box":
            styles.append(f"Style: TextWatermark,{chosen_font},{calc_wm_size},{primary_col},&H000000FF,&H00000000,&H{box_alpha:02X}000000,-1,0,0,0,100,100,0,0,3,4,1,7,{wm_margin_lr},{wm_margin_lr},{wm_margin_v},1")
        else: # shadow (clean broadcast style)
            styles.append(f"Style: TextWatermark,{chosen_font},{calc_wm_size},{primary_col},&H000000FF,&H{outline_alpha:02X}000000,&H{box_alpha:02X}000000,-1,0,0,0,100,100,0,0,1,2,2,7,{wm_margin_lr},{wm_margin_lr},{wm_margin_v},1")

    style_block = "\n".join(styles)
    body = [header, style_block, "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]

    # Tool 5: Inject Episode Badge Dialogue Event
    if enable_episode_badge and episode_badge_text:
        clean_badge_text = episode_badge_text.replace("\n", r"\N").replace("\r", "")
        if episode_badge_duration == "intro_10s":
            end_sec = min(float(video_duration) if video_duration else 10.0, 10.0)
            end_ass = seconds_to_ass_time(end_sec)
            fade_tag = r"{\fad(350,750)}"
            body.append(f"Dialogue: 1,0:00:00.00,{end_ass},EpisodeBadge,,0,0,0,,{fade_tag}{clean_badge_text}")
        else:
            # Stays on screen for entire video
            dur = max(float(video_duration) if video_duration else 86400.0, 86400.0)
            end_ass = seconds_to_ass_time(dur)
            body.append(f"Dialogue: 1,0:00:00.00,{end_ass},EpisodeBadge,,0,0,0,,{clean_badge_text}")

    # Tool 6: Inject Text Watermark Events (with Auto-Move position support)
    if enable_text_watermark and text_watermark_text:
        clean_wm_text = text_watermark_text.replace("\n", r"\N").replace("\r", "")
        align_map = {"top_left": 7, "top_right": 9, "bottom_left": 1, "bottom_right": 3, "top_center": 8, "bottom_center": 2}
        init_align = align_map.get(text_watermark_position, 9)
        dur = max(float(video_duration) if video_duration else 86400.0, 86400.0)

        if not watermark_auto_move:
            end_ass = seconds_to_ass_time(dur)
            body.append(f"Dialogue: 2,0:00:00.00,{end_ass},TextWatermark,,0,0,0,,{{\\an{init_align}}}{clean_wm_text}")
        elif watermark_move_mode == "ghost_flash":
            step = max(15.0, float(watermark_move_interval or 30))
            flash_dur = 6.0
            t = 5.0
            corner_order = [7, 9, 3, 1]
            c_idx = 0
            while t < dur:
                end_flash = min(dur, t + flash_dur)
                align = corner_order[c_idx % 4]
                body.append(f"Dialogue: 2,{seconds_to_ass_time(t)},{seconds_to_ass_time(end_flash)},TextWatermark,,0,0,0,,{{\\an{align}\\fad(600,600)}}{clean_wm_text}")
                t += step
                c_idx += 1
        else:
            # "corner_rotate": rotates through the 4 corners sequentially with smooth fade
            step = max(10.0, float(watermark_move_interval or 30))
            corner_order = [7, 9, 3, 1] # TL, TR, BR, BL
            try:
                start_c_idx = corner_order.index(init_align)
            except ValueError:
                start_c_idx = 1
            t = 0.0
            c_idx = start_c_idx
            while t < dur:
                next_t = min(dur, t + step)
                align = corner_order[c_idx % 4]
                body.append(f"Dialogue: 2,{seconds_to_ass_time(t)},{seconds_to_ass_time(next_t)},TextWatermark,,0,0,0,,{{\\an{align}\\fad(400,400)}}{clean_wm_text}")
                t = next_t
                c_idx += 1

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
