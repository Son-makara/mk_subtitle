import uuid
from pydantic import BaseModel, Field
from typing import List, Optional, Union

class SubtitleItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    index: int = 1
    start_time: float = Field(0.0, description="Start time in seconds")
    end_time: float = Field(0.0, description="End time in seconds")
    text: str = Field("", description="Original subtitle text")
    translated_text: Optional[str] = Field(None, description="Khmer / translated subtitle text")
    gender: str = Field("Male", description="Voice profile: Male or Female")
    audio_status: str = Field("idle", description="idle, generating, ready, error")
    speed: float = Field(1.0, description="Playback / speech speed multiplier")
    speaker: Optional[str] = Field("Narrator", description="Speaker label")
    audio_url: Optional[str] = Field(None, description="URL or relative path to generated TTS audio")
    audio_duration: Optional[float] = Field(None, description="Duration of generated audio in seconds")
    audio_start: Optional[float] = Field(None, description="Audio start time on timeline")
    audio_end: Optional[float] = Field(None, description="Audio end time on timeline")
    base_audio_duration: Optional[float] = Field(None, description="Base audio duration before speed adjust")
    is_duration_exceeded: Optional[bool] = Field(False, description="Whether audio exceeds subtitle interval")
    audio_engine: Optional[str] = Field(None, description="TTS engine used: 'edge-tts' or 'mms-offline'")

    class Config:
        extra = "ignore"

class SubtitleProject(BaseModel):
    id: Optional[str] = None
    title: str = "Untitled Project"
    video_filename: Optional[str] = None
    video_url: Optional[str] = None
    items: List[SubtitleItem] = []
    source_language: str = "auto"
    target_language: str = "km"
    default_voice: str = "km-KH-PisethNeural"

class TTSGenerateItemRequest(BaseModel):
    item_id: str
    text: str
    gender: str = "Male"
    voice: Optional[str] = None
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"
    speed: float = 1.0
    target_duration: Optional[float] = None
    auto_fit: bool = True
    engine: Optional[str] = "edge-tts"  # "edge-tts" or "mms-offline"

class TTSBatchRequest(BaseModel):
    items: List[SubtitleItem]
    use_translation: bool = True
    voice_male: str = "km-KH-PisethNeural"
    voice_female: str = "km-KH-SreymomNeural"
    default_voice: Optional[str] = "km-KH-PisethNeural"
    target_field: Optional[str] = "translated_text"
    speed_stretch_fit: Optional[bool] = True
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"
    auto_fit: bool = True
    engine: Optional[str] = "edge-tts"  # "edge-tts" or "mms-offline"

    class Config:
        extra = "ignore"

class TranslationRequest(BaseModel):
    items: List[SubtitleItem]
    source_lang: str = "auto"
    target_lang: str = "km"
    provider: str = "google_free" # "google_free", "gemini", or "nllb_offline"
    gemini_api_key: Optional[str] = None

    class Config:
        extra = "ignore"

class VideoBurnRequest(BaseModel):
    video_filename: str
    video_file_path: Optional[str] = None
    items: List[SubtitleItem]
    burn_subtitles: bool = True
    subtitle_mode: str = "khmer" # "khmer", "original", "none"
    subtitle_position: str = "bottom" # "bottom", "middle", "top"
    vertical_offset: int = 55
    use_translation: bool = True
    include_dubbing: bool = True
    mute_original_audio: bool = False # Mute original video audio only when dubbing with Khmer voice
    subtitle_style: str = "modern_yellow"
    font_name: str = "Kantumruy Pro"
    font_size: int = 22
    primary_color: Optional[str] = None
    outline_color: Optional[str] = None
    background_ducking_volume: float = 0.25
    smart_ducking: bool = True
    ducking_attack: int = 40
    ducking_release: int = 350
    bgm_filename: Optional[str] = None
    bgm_volume: float = 0.3
    bgm_crossfade: bool = True
    bgm_fade_in: float = 2.0
    bgm_fade_out: float = 3.0
    enable_delogo: bool = False
    delogo_mode: str = "blur"  # "blur", "pixelate", "black_bar", "frosted"
    delogo_area: str = "bottom_subtitles"  # "bottom_subtitles", "top_banner", "top_right", "top_left", "custom"
    delogo_height_pct: float = 0.14
    delogo_x_pct: float = 0.0
    delogo_y_pct: float = 0.86
    delogo_w_pct: float = 1.0
    delogo_shape: str = "rectangle"  # "rectangle", "pill"
    enable_anti_copyright: bool = False
    anti_copyright_flip: bool = True
    anti_copyright_zoom: float = 1.03
    anti_copyright_color: bool = True
    anti_copyright_speed: float = 1.03
    mirror_horizontal: bool = False  # Independent Horizontal mirror flip (hflip)
    flip_vertical: bool = False      # Independent Vertical flip (vflip)
    rotate_angle: int = 0            # 0, 90, 180, 270 degrees
    use_amf_gpu: bool = True
    add_logo_watermark: bool = False
    watermark_custom_path: Optional[str] = None
    watermark_position: str = "top_right"  # "top_right", "top_left", "bottom_right", "bottom_left", "center"
    watermark_size: int = 90
    watermark_opacity: float = 0.85
    watermark_margin: int = 20
    job_id: Optional[str] = None
    custom_output_filename: Optional[str] = None

    class Config:
        extra = "ignore"

class STTRequest(BaseModel):
    video_filename: Optional[str] = None
    model_size: str = "base"
    language: Optional[str] = "auto"
    engine: str = "faster-whisper"  # "faster-whisper" or "whisper"
    auto_translate_to_khmer: bool = True


class VocalSeparationRequest(BaseModel):
    video_filename: Optional[str] = None

class VideoConcatRequest(BaseModel):
    video_filenames: List[str]
    custom_output_filename: Optional[str] = None
    job_id: Optional[str] = None

    class Config:
        extra = "ignore"

class VideoSplitSegment(BaseModel):
    start_time: str
    end_time: str
    output_filename: Optional[str] = None

class VideoSplitRequest(BaseModel):
    video_filename: str
    segments: List[VideoSplitSegment]
    job_id: Optional[str] = None

    class Config:
        extra = "ignore"

class VideoMirrorRequest(BaseModel):
    video_filename: str
    video_file_path: Optional[str] = None
    mirror_horizontal: bool = True
    flip_vertical: bool = False
    rotate_angle: int = 0
    use_amf_gpu: bool = True
    custom_output_filename: Optional[str] = None
    job_id: Optional[str] = None

    class Config:
        extra = "ignore"

class OpenVlcRequest(BaseModel):
    video_filename: Optional[str] = None
    subtitles: Optional[List[SubtitleItem]] = None

    class Config:
        extra = "ignore"
