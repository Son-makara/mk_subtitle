import React, { useState } from 'react';
import { Download, Flame, X, Check, FileText, FolderCheck, HardDrive, Trash2 } from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  type, // 'subs' or 'burn'
  onExportSubs,
  onRenderBurn,
  onSaveRenderedVideo,
  isProcessing,
  downloadResult,
  subtitles = []
}) {
  const [subFormat, setSubFormat] = useState('srt');
  const [useTranslation, setUseTranslation] = useState(true);

  // Check if any subtitle item has Khmer TTS voice generated
  const hasKhmerVoice = React.useMemo(() => {
    return Boolean(
      subtitles && subtitles.some((s) => s.audio_url || s.audio_status === 'ready')
    );
  }, [subtitles]);

  // Burn options: Default dubbing and muting enabled by default
  const [stylePreset, setStylePreset] = useState('modern_yellow');
  const [includeDubbing, setIncludeDubbing] = useState(true);
  const [muteOriginalAudio, setMuteOriginalAudio] = useState(true);
  const [duckingVol, setDuckingVol] = useState(25);
  const [useAmfGpu, setUseAmfGpu] = useState(true);
  const [addLogoWatermark, setAddLogoWatermark] = useState(false);
  const [autoPurgeCache, setAutoPurgeCache] = useState(true);

  const handleDubbingToggle = (e) => {
    const checked = e.target.checked;
    setIncludeDubbing(checked);
    if (!checked) {
      // When dubbed audio is turned off, do NOT mute original video audio
      setMuteOriginalAudio(false);
    } else {
      setMuteOriginalAudio(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="MK" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ef4444' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {type === 'subs' ? 'Export Subtitles' : 'Burn & Render MP4 Video'}
            </h3>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {type === 'subs' ? (
          /* ================= Subtitle Export Form ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Select File Format:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['srt', 'vtt', 'ass'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSubFormat(fmt)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1px solid ${subFormat === fmt ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      backgroundColor: subFormat === fmt ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                      color: subFormat === fmt ? '#fff' : 'var(--text-muted)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    .{fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useTranslation}
                onChange={(e) => setUseTranslation(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              Export translated Khmer text (if available)
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => onExportSubs(subFormat, useTranslation)}
                className="btn-primary"
              >
                <Download size={14} /> Choose Location & Save
              </button>
            </div>
          </div>
        ) : (
          /* ================= Video Burn Render Form ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {downloadResult ? (
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <Check size={28} />
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-bright)' }}>
                    Render Finished Successfully!
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {downloadResult.export_filename}
                  </p>
                </div>

                {/* Storage saving note */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <HardDrive size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
                  <div>
                    Choose where to save on your PC. Temporary server cache will be automatically purged to save disk space.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {/* Choose Location & Save */}
                  <button
                    onClick={() => onSaveRenderedVideo(downloadResult, autoPurgeCache)}
                    className="btn-primary"
                    style={{
                      backgroundColor: '#10b981',
                      padding: '12px',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <FolderCheck size={18} /> Choose Location & Save Video
                  </button>

                  <a
                    href={downloadResult.download_url}
                    download={downloadResult.export_filename || 'rendered_video.mp4'}
                    className="btn-secondary"
                    style={{
                      padding: '10px',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: 'var(--text-bright)'
                    }}
                  >
                    <Download size={16} /> Direct Download
                  </a>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoPurgeCache}
                      onChange={(e) => setAutoPurgeCache(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    Auto-purge temporary server files immediately after saving
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Subtitle Visual Style:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'modern_yellow', label: 'Cinematic Yellow' },
                      { id: 'classic_white', label: 'Classic White' },
                      { id: 'box_dark', label: 'Dark Boxed' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setStylePreset(st.id)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: `1px solid ${stylePreset === st.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          backgroundColor: stylePreset === st.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                          color: stylePreset === st.id ? '#fff' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useTranslation}
                      onChange={(e) => setUseTranslation(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    Burn translated subtitles (Khmer)
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeDubbing}
                      onChange={handleDubbingToggle}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span>Include dubbed audio track (Khmer AI TTS voiceover)</span>
                    {hasKhmerVoice ? (
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        ✓ Voice ready
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 500 }}>
                        🎙️ Auto-generate AI voice during render
                      </span>
                    )}
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      cursor: includeDubbing ? 'pointer' : 'not-allowed',
                      opacity: includeDubbing ? 1 : 0.6
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeDubbing && muteOriginalAudio}
                      disabled={!includeDubbing}
                      onChange={(e) => setMuteOriginalAudio(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                    />
                    <span style={{ fontWeight: 600, color: (includeDubbing && muteOriginalAudio) ? '#34d399' : 'var(--text-primary)' }}>
                      Remove original video voice (100% clean dubbing + BGM)
                    </span>
                  </label>

                  {includeDubbing && muteOriginalAudio ? (
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(5, 150, 105, 0.15)',
                        border: '1px solid rgba(5, 150, 105, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#6ee7b7'
                      }}
                    >
                      ✓ Original foreign dialogue will be completely muted. Output plays only your new Khmer AI voiceover and loaded BGM.
                    </div>
                  ) : includeDubbing && !muteOriginalAudio ? (
                    <div style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Background Audio Ducking:</span>
                        <span>{duckingVol}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={duckingVol}
                        onChange={(e) => setDuckingVol(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#93c5fd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>ℹ️</span>
                      <span>
                        Dubbing track disabled: Original video audio and music will NOT be muted.
                      </span>
                    </div>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={addLogoWatermark}
                      onChange={(e) => setAddLogoWatermark(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img src="/logo.png" alt="MK" style={{ width: '15px', height: '15px', borderRadius: '50%' }} />
                      Add MK Movie watermark logo (Top-Right corner)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useAmfGpu}
                      onChange={(e) => setUseAmfGpu(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    Enable AMD AMF Hardware Acceleration (h264_amf)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button onClick={onClose} className="btn-secondary" disabled={isProcessing}>
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      onRenderBurn({
                        subtitle_style: stylePreset,
                        use_translation: useTranslation,
                        include_dubbing: includeDubbing,
                        mute_original_audio: includeDubbing ? muteOriginalAudio : false,
                        add_logo_watermark: addLogoWatermark,
                        background_ducking_volume: duckingVol / 100,
                        use_amf_gpu: useAmfGpu
                      })
                    }
                    className="btn-primary"
                    disabled={isProcessing}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'
                    }}
                  >
                    <Flame size={14} />
                    {isProcessing ? 'Rendering in background...' : 'Start Rendering'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
