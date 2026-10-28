import re
import uuid
from typing import List, Dict, Any, Tuple
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

def export_ass(items: List[SubtitleItem], use_translated: bool = False, style_preset: str = "modern_yellow") -> str:
    # ASS Header with styles
    header = """[Script Info]
Title: mk_subtitle Auto Generated
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
"""
    # Style definitions
    # ASS Hex colors: &HAABBGGRR (Alpha, Blue, Green, Red)
    if style_preset == "modern_yellow":
        style_line = "Style: Default,Arial,52,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,40,40,55,1"
    elif style_preset == "box_dark":
        style_line = "Style: Default,Segoe UI,48,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,3,2,1,2,30,30,50,1"
    else: # classic_white
        style_line = "Style: Default,Arial,50,&H00FFFFFF,&H000000FF,&H00000000,&H60000000,-1,0,0,0,100,100,0,0,1,3,2,2,40,40,50,1"

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

