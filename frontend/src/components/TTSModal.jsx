import React, { useState, useEffect } from 'react';
import { Mic, Volume2, X, Play } from 'lucide-react';

export default function TTSModal({ isOpen, onClose, onGenerateBatch, voices, isProcessing }) {
  const [selectedVoice, setSelectedVoice] = useState('km-KH-PisethNeural');
  const [rate, setRate] = useState(0); // -50 to +50
  const [pitch, setPitch] = useState(0); // -20 to +20
  const [useTranslation, setUseTranslation] = useState(true);
  const [autoFit, setAutoFit] = useState(true);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  if (!isOpen) return null;

  const handlePreviewVoice = async () => {
    setIsPreviewing(true);
    try {
      const sampleText = selectedVoice.startsWith('km')
        ? 'សួស្តី! នេះគឺជាសំឡេងសាកល្បងរបស់ប្រព័ន្ធស្វ័យប្រវត្តិ។'
        : 'Hello! This is a test preview of the AI neural voice.';

      const resp = await fetch('/api/tts/generate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: 'preview',
          text: sampleText,
          voice: selectedVoice,
          rate: rate >= 0 ? `+${rate}%` : `${rate}%`,
          pitch: pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`,
          auto_fit: false
        })
      });
      const data = await resp.json();
      if (data.audio_url) {
        const audio = new Audio(data.audio_url);
        audio.play();
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleStartBatch = () => {
    onGenerateBatch({
      voice: selectedVoice,
      rate: rate >= 0 ? `+${rate}%` : `${rate}%`,
      pitch: pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`,
      use_translation: useTranslation,
      auto_fit: autoFit
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mic size={20} style={{ color: '#34d399' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Neural Voice Dubbing (Edge-TTS)</h3>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Voice Selector */}
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Select Neural Voice:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.label || v.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handlePreviewVoice}
                className="btn-secondary"
                disabled={isPreviewing}
                title="Hear sample voice"
              >
                <Play size={14} /> Preview
              </button>
            </div>
          </div>

          {/* Speech Rate Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Speech Speed:</span>
              <span style={{ fontWeight: 600 }}>{rate >= 0 ? `+${rate}%` : `${rate}%`}</span>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              value={rate}
              onChange={(e) => setRate(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
          </div>

          {/* Pitch Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pitch Offset:</span>
              <span style={{ fontWeight: 600 }}>{pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={pitch}
              onChange={(e) => setPitch(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useTranslation}
                onChange={(e) => setUseTranslation(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)' }}
              />
              Use translated text for voiceover (if available)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoFit}
                onChange={(e) => setAutoFit(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)' }}
              />
              Auto-fit duration (accelerate audio if it exceeds subtitle window)
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleStartBatch} className="btn-primary" disabled={isProcessing}>
              {isProcessing ? 'Generating Speech...' : 'Generate Voiceover for All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

