from pydantic import BaseModel, Field
from typing import List, Optional

class SubtitleItem(BaseModel):
    id: str
    index: int
    start_time: float = Field(..., description="Start time in seconds")
    end_time: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Original subtitle text")
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

    class Config:
        extra = "ignore"

class TranslationRequest(BaseModel):
    items: List[SubtitleItem]
    source_lang: str = "auto"
    target_lang: str = "km"
    provider: str = "gemini" # gemini or google_free
    gemini_api_key: Optional[str] = None

class VideoBurnRequest(BaseModel):
    video_filename: str
    items: List[SubtitleItem]
    use_translation: bool = True
    include_dubbing: bool = True
    mute_original_audio: bool = False # Mute original video audio only when dubbing with Khmer voice
    subtitle_style: str = "modern_yellow"
    font_name: str = "Kantumruy Pro"
    font_size: int = 22
    primary_color: str = "&H00FFFF"
    outline_color: str = "&H000000"
    background_ducking_volume: float = 0.25
    bgm_filename: Optional[str] = None
    bgm_volume: float = 0.3
    use_amf_gpu: bool = True
    add_logo_watermark: bool = False
    job_id: Optional[str] = None
    custom_output_filename: Optional[str] = None

class STTRequest(BaseModel):
    video_filename: Optional[str] = None
    model_size: str = "base"
    language: Optional[str] = "auto"
    auto_translate_to_khmer: bool = True


class VocalSeparationRequest(BaseModel):
    video_filename: Optional[str] = None
