import React from 'react';
import {
  Upload,
  Sparkles,
  Languages,
  Mic,
  CheckCheck,
  Download,
  Eye,
  EyeOff,
  Flame
} from 'lucide-react';

export default function Toolbar({
  onSubtitleUpload,
  onOpenWhisper,
  onOpenTranslate,
  onOpenTTS,
  onFixOverlaps,
  onOpenExport,
  onOpenBurn,
  showTranslation,
  setShowTranslation,
  hasSubtitles,
  hasVideo,
  isProcessing
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: '52px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        gap: '12px'
      }}
    >
      {/* Left Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Subtitle File Upload */}
        <label className="btn-secondary" style={{ padding: '6px 12px', cursor: 'pointer' }}>
          <input
            type="file"
            accept=".srt,.vtt,.ass,.ssa"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onSubtitleUpload(e.target.files[0]);
              }
            }}
          />
          <Upload size={14} /> Import Subs
        </label>

        {/* Whisper STT */}
        <button
          onClick={onOpenWhisper}
          className="btn-secondary"
          disabled={!hasVideo || isProcessing}
          title="Extract speech to subtitles with Whisper AI"
        >
          <Sparkles size={14} style={{ color: '#a855f7' }} /> Auto Transcribe
        </button>

        {/* Translate */}
        <button
          onClick={onOpenTranslate}
          className="btn-secondary"
          disabled={!hasSubtitles || isProcessing}
          title="Translate subtitles using Gemini AI or Google Translate"
        >
          <Languages size={14} style={{ color: '#38bdf8' }} /> Translate
        </button>

        {/* Dubbing TTS */}
        <button
          onClick={onOpenTTS}
          className="btn-secondary"
          disabled={!hasSubtitles || isProcessing}
          title="Generate voiceover speech for subtitles"
        >
          <Mic size={14} style={{ color: '#34d399' }} /> Voice Dubbing
        </button>

        {/* Fix Overlaps */}
        <button
          onClick={onFixOverlaps}
          className="btn-secondary"
          disabled={!hasSubtitles}
          title="Automatically resolve overlapping timestamps"
        >
          <CheckCheck size={14} /> Fix Overlaps
        </button>
      </div>

      {/* Right Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Toggle Translation Display */}
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          title="Toggle translated subtitle line"
        >
          {showTranslation ? <EyeOff size={14} /> : <Eye size={14} />}
          {showTranslation ? 'Hide Translation' : 'Show Translation'}
        </button>

        {/* Export Subtitles */}
        <button
          onClick={onOpenExport}
          className="btn-secondary"
          disabled={!hasSubtitles}
        >
          <Download size={14} /> Export Subs
        </button>

        {/* Burn Video Button */}
        <button
          onClick={onOpenBurn}
          className="btn-primary"
          disabled={!hasVideo || !hasSubtitles || isProcessing}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
          }}
        >
          <Flame size={14} /> Burn & Render MP4
        </button>
      </div>
    </div>
  );
}

