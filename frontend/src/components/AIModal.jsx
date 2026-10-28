import React, { useState } from 'react';
import { Sparkles, Languages, X, Key, Info, Loader2, FolderOpen, Film, Check } from 'lucide-react';

export default function AIModal({
  isOpen,
  onClose,
  mode, // 'whisper' or 'translate'
  videoLoaded = true,
  videoDisplayName = '',
  onUploadVideo,
  onStartWhisper,
  onStartTranslate,
  isProcessing
}) {
  // Whisper settings
  const [modelSize, setModelSize] = useState('base');
  const [whisperLang, setWhisperLang] = useState('auto');
  const [autoTranslateKhmer, setAutoTranslateKhmer] = useState(true);

  // Translation settings
  const [provider, setProvider] = useState('google_free'); // google_free or gemini
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('km');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('mk_gemini_api_key') || '');

  if (!isOpen) return null;

  const handleTranslateSubmit = () => {
    if (geminiApiKey) {
      localStorage.setItem('mk_gemini_api_key', geminiApiKey);
    }
    onStartTranslate({
      provider,
      source_lang: sourceLang,
      target_lang: targetLang,
      gemini_api_key: geminiApiKey || null
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="MK" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ef4444' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {mode === 'whisper' ? 'Whisper Speech-to-Text Auto Transcription' : 'AI Subtitle Translation'}
            </h3>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 8px' }} disabled={isProcessing}>
            <X size={16} />
          </button>
        </div>

        {mode === 'whisper' ? (
          /* ================= Whisper Form ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Video File Status / Selector */}
            {videoLoaded ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(79, 70, 229, 0.12)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--text-bright)'
                }}
              >
                <Film size={15} style={{ color: 'var(--accent-text)', flexShrink: 0 }} />
                <span>Target Video:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {videoDisplayName || 'Loaded Media'}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px dashed rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '12px', color: '#f87171', fontWeight: 500 }}>
                  No video currently loaded in studio.
                </div>
                <label
                  className="btn-primary"
                  style={{
                    alignSelf: 'center',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '6px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && onUploadVideo) {
                        onUploadVideo(e.target.files[0]);
                      }
                    }}
                  />
                  <FolderOpen size={14} /> Select Video or Audio File
                </label>
              </div>
            )}

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Whisper AI Model Size:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { id: 'tiny', label: 'Tiny (Fastest)' },
                  { id: 'base', label: 'Base (Balanced)' },
                  { id: 'small', label: 'Small (Accurate)' },
                  { id: 'medium', label: 'Medium (High-Def)' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModelSize(m.id)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      border: `1px solid ${modelSize === m.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      backgroundColor: modelSize === m.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                      color: modelSize === m.id ? '#fff' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Spoken Audio Language:
              </label>
              <select
                value={whisperLang}
                onChange={(e) => setWhisperLang(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="auto">Auto Detect Language</option>
                <option value="zh">Chinese (Mandarin)</option>
                <option value="en">English</option>
                <option value="km">Khmer</option>
                <option value="vi">Vietnamese</option>
                <option value="th">Thai</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={autoTranslateKhmer}
                onChange={(e) => setAutoTranslateKhmer(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px' }}
              />
              <span>Automatically translate transcribed speech to Khmer (for dubbing)</span>
            </label>

            {isProcessing && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'rgba(5, 150, 105, 0.15)',
                  border: '1px solid rgba(5, 150, 105, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#34d399'
                }}
              >
                <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
                <span>Running Whisper STT extraction... (This usually takes 10–30s on CPU)</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={onClose} className="btn-secondary" disabled={isProcessing}>
                Cancel
              </button>
              <button
                onClick={() =>
                  onStartWhisper({
                    model_size: modelSize,
                    language: whisperLang,
                    auto_translate_to_khmer: autoTranslateKhmer
                  })
                }
                className="btn-primary"
                disabled={isProcessing}
                style={{ minWidth: '160px', justifyContent: 'center' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Start Transcription
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ================= Translation Form ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Translation Engine:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { id: 'google_free', label: 'Google Translate (Free, Instant)' },
                  { id: 'gemini', label: 'Google Gemini AI (Cinematic Context)' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: `1px solid ${provider === p.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      backgroundColor: provider === p.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                      color: provider === p.id ? '#fff' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {provider === 'gemini' && (
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Gemini API Key:
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    placeholder="Enter your Google Gemini API Key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px 12px 8px 32px',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Source Language:
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="auto">Auto Detect</option>
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="km">Khmer</option>
                  <option value="vi">Vietnamese</option>
                  <option value="th">Thai</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Target Language:
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="km">Khmer (ភាសាខ្មែរ)</option>
                  <option value="en">English</option>
                  <option value="vi">Vietnamese</option>
                  <option value="th">Thai</option>
                  <option value="zh">Chinese</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={onClose} className="btn-secondary" disabled={isProcessing}>
                Cancel
              </button>
              <button
                onClick={handleTranslateSubmit}
                className="btn-primary"
                disabled={isProcessing}
              >
                <Languages size={14} />
                {isProcessing ? 'Translating with AI...' : 'Translate All Lines'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

