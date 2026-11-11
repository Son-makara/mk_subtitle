import React, { useState } from 'react';
import { Download, Flame, X, Check, FileText, FolderCheck, HardDrive, Trash2, Type, Sliders, Eye } from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  type, // 'subs' or 'burn'
  onExportSubs,
  onRenderBurn,
  onSaveRenderedVideo,
  isProcessing,
  downloadResult,
  subtitles = [],
  queue = [],
  selectedQueueIds = [],
  onBatchRender,
  isBatchRendering = false,
  subSettings,
  onUpdateSubSettings,
  onResetRenderResult
}) {
  const [subFormat, setSubFormat] = useState('srt');
  const [useTranslation, setUseTranslation] = useState(true);
  const [renderScope, setRenderScope] = useState(() => (queue && queue.length > 1 ? 'batch' : 'single'));
  const [batchOutputMode, setBatchOutputMode] = useState('separate'); // 'separate' or 'combine'
  const [combinedTitle, setCombinedTitle] = useState('');

  // Auto-switch renderScope to batch when modal opens with multiple queue items
  React.useEffect(() => {
    if (isOpen && ((selectedQueueIds && selectedQueueIds.length > 1) || (queue && queue.length > 1))) {
      setRenderScope('batch');
    }
  }, [isOpen, selectedQueueIds, queue]);

  // Default combined title based on first video, folder name, or series title
  React.useEffect(() => {
    if (!combinedTitle && queue && queue.length > 0) {
      const firstVid = queue[0];
      const folder = firstVid.folderName;
      let base = '';
      if (folder) {
        base = folder.trim();
      } else {
        base = (firstVid.name || firstVid.serverFilename || 'Series')
          .replace(/\.[^/.]+$/, '')
          .replace(/^mk_sub_/, '')
          .replace(/_dubbed$/, '')
          .replace(/S\d+E\d+/i, '')
          .replace(/第?\d+集/g, '')
          .replace(/[-_ ]+$/, '')
          .trim();
      }
      if (!base) base = 'Combined_Series';
      setCombinedTitle(`${base}_Full_Movie.mp4`);
    }
  }, [queue, combinedTitle]);

  // Switch between 'settings' (edit styles) and 'result' (download/save finished video)
  const [viewMode, setViewMode] = useState('settings');
  const prevResultRef = React.useRef(null);

  React.useEffect(() => {
    if (downloadResult) {
      if (downloadResult !== prevResultRef.current) {
        setViewMode('result');
        prevResultRef.current = downloadResult;
      }
    } else {
      setViewMode('settings');
    }
  }, [downloadResult]);

  // Subtitle settings state with sync to parent & localStorage
  const [subtitleMode, setSubtitleMode] = useState(subSettings?.subtitleMode || 'khmer');
  const [fontName, setFontName] = useState(subSettings?.fontName || 'Kantumruy Pro');
  const [fontSize, setFontSize] = useState(subSettings?.fontSize || 24);
  const [position, setPosition] = useState(subSettings?.position || 'bottom');
  const [verticalOffset, setVerticalOffset] = useState(subSettings?.verticalOffset || 55);
  const [stylePreset, setStylePreset] = useState(subSettings?.stylePreset || 'modern_yellow');

  // Internal local PC fonts state fetched from local Windows backend
  const [systemFonts, setSystemFonts] = useState({
    khmer: [
      'Kantumruy Pro',
      'Khmer OS Siemreap',
      'Khmer OS Battambang',
      'Khmer OS Muol',
      'Khmer OS Content',
      'Leelawadee UI'
    ],
    popular: ['Arial', 'Segoe UI', 'Tahoma', 'Calibri', 'Impact'],
    all: [],
    total_count: 0,
    khmer_count: 0
  });
  const [isCustomFont, setIsCustomFont] = useState(false);
  const [customFontInput, setCustomFontInput] = useState('');

  React.useEffect(() => {
    fetch('/api/system/fonts')
      .then((res) => res.json())
      .then((data) => {
        if (data && (data.khmer || data.all)) {
          setSystemFonts(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch system fonts:', err);
      });
  }, []);

  // Synchronize state if subSettings prop changes
  React.useEffect(() => {
    if (subSettings) {
      if (subSettings.subtitleMode !== undefined) setSubtitleMode(subSettings.subtitleMode);
      if (subSettings.fontName !== undefined) setFontName(subSettings.fontName);
      if (subSettings.fontSize !== undefined) setFontSize(subSettings.fontSize);
      if (subSettings.position !== undefined) setPosition(subSettings.position);
      if (subSettings.verticalOffset !== undefined) setVerticalOffset(subSettings.verticalOffset);
      if (subSettings.stylePreset !== undefined) setStylePreset(subSettings.stylePreset);
    }
  }, [subSettings]);

  const updateSettings = (partial) => {
    const updated = {
      subtitleMode: partial.subtitleMode !== undefined ? partial.subtitleMode : subtitleMode,
      fontName: partial.fontName !== undefined ? partial.fontName : fontName,
      fontSize: partial.fontSize !== undefined ? partial.fontSize : fontSize,
      position: partial.position !== undefined ? partial.position : position,
      verticalOffset: partial.verticalOffset !== undefined ? partial.verticalOffset : verticalOffset,
      stylePreset: partial.stylePreset !== undefined ? partial.stylePreset : stylePreset,
    };
    if (partial.subtitleMode !== undefined) setSubtitleMode(partial.subtitleMode);
    if (partial.fontName !== undefined) setFontName(partial.fontName);
    if (partial.fontSize !== undefined) setFontSize(partial.fontSize);
    if (partial.position !== undefined) setPosition(partial.position);
    if (partial.verticalOffset !== undefined) setVerticalOffset(partial.verticalOffset);
    if (partial.stylePreset !== undefined) setStylePreset(partial.stylePreset);
    if (onUpdateSubSettings) {
      onUpdateSubSettings(updated);
    }
  };

  // Sample text for live preview
  const sampleSubtitleText = React.useMemo(() => {
    if (subtitleMode === 'none') return '';
    const firstItem = subtitles && subtitles.length > 0 ? subtitles[0] : null;
    if (subtitleMode === 'original') {
      return firstItem?.text || '你好，欢迎来到MK影视！';
    }
    return firstItem?.translated_text || firstItem?.text || 'ជំរាបសួរ! សូមស្វាគមន៍មកកាន់ MK Movie Studio!';
  }, [subtitles, subtitleMode]);

  // Calculate batch count
  const targetBatchCount = React.useMemo(() => {
    if (selectedQueueIds && selectedQueueIds.length > 0) {
      return selectedQueueIds.length;
    }
    return queue ? queue.length : 0;
  }, [selectedQueueIds, queue]);

  // Check if any subtitle item has Khmer TTS voice generated
  const hasKhmerVoice = React.useMemo(() => {
    return Boolean(
      subtitles && subtitles.some((s) => s.audio_url || s.audio_status === 'ready')
    );
  }, [subtitles]);

  // Burn options: Default dubbing and muting enabled by default
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
      <div className="modal-card" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="MK" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ef4444' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
              {type === 'subs' ? 'Export Subtitles' : 'Burn & Render MP4 Video'}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {type === 'burn' && downloadResult && (
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-base)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('settings')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: viewMode === 'settings' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: viewMode === 'settings' ? '#ffffff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Customize subtitle text size, font, position and visual style"
                >
                  <Sliders size={12} style={{ color: '#f59e0b' }} />
                  <span>Subtitle Style</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('result')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: viewMode === 'result' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: viewMode === 'result' ? '#10b981' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="View ready video download and save options"
                >
                  <Check size={12} />
                  <span>Finished Video</span>
                </button>
              </div>
            )}
            <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 8px' }}>
              <X size={16} />
            </button>
          </div>
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
            {downloadResult && viewMode === 'result' ? (
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

                {/* Subtitle Font & Style Info Card with 1-click Change Button */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Type size={16} style={{ color: '#38bdf8' }} />
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Subtitle Font: </span>
                      <strong style={{ color: '#38bdf8' }}>{fontName}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> ({fontSize}px • {stylePreset === 'modern_yellow' ? 'Yellow' : stylePreset === 'box_dark' ? 'Dark Box' : 'White'})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('settings')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Change subtitle font, size, position or style and re-render"
                  >
                    <Sliders size={12} />
                    <span>Change Font & Re-render</span>
                  </button>
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

                  {/* Back to Edit Subtitle Style & Re-render */}
                  <button
                    type="button"
                    onClick={() => setViewMode('settings')}
                    style={{
                      padding: '11px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-bright)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Change subtitle font, size, position, or colors and re-render"
                  >
                    <Sliders size={16} style={{ color: '#f59e0b' }} />
                    <span>Back to Edit Subtitle Style & Re-render</span>
                  </button>

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
                {/* Banner showing previous render ready */}
                {downloadResult && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontSize: '12px',
                      color: '#10b981'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Check size={15} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Finished video ready: <strong>{downloadResult.export_filename}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode('result')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '0 4px',
                        flexShrink: 0
                      }}
                    >
                      View & Save
                    </button>
                  </div>
                )}
                {/* 1. Target Scope Switcher (Single vs Batch Multi-Video) */}
                {queue && queue.length > 1 && (
                  <div>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                      Render Scope:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setRenderScope('single')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${renderScope === 'single' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          backgroundColor: renderScope === 'single' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                          color: renderScope === 'single' ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>🎬 Current Video (1)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRenderScope('batch')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${renderScope === 'batch' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          backgroundColor: renderScope === 'batch' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                          color: renderScope === 'batch' ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>⚡ Batch Queue ({targetBatchCount} Videos)</span>
                      </button>
                    </div>

                    {renderScope === 'batch' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        {/* Output Mode Switcher: Separate vs Combine into 1 Video */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Batch Output Format:
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setBatchOutputMode('separate')}
                              style={{
                                padding: '7px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${batchOutputMode === 'separate' ? '#f59e0b' : 'var(--border-color)'}`,
                                backgroundColor: batchOutputMode === 'separate' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-base)',
                                color: batchOutputMode === 'separate' ? '#f59e0b' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>📁 Separate Episode Files ({targetBatchCount})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setBatchOutputMode('combine')}
                              style={{
                                padding: '7px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${batchOutputMode === 'combine' ? '#10b981' : 'var(--border-color)'}`,
                                backgroundColor: batchOutputMode === 'combine' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-base)',
                                color: batchOutputMode === 'combine' ? '#10b981' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>🎞️ Combine into 1 Video (Full Movie)</span>
                            </button>
                          </div>
                        </div>

                        {/* Explanation card */}
                        <div
                          style={{
                            padding: '8px 12px',
                            backgroundColor: batchOutputMode === 'combine' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${batchOutputMode === 'combine' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: batchOutputMode === 'combine' ? '#6ee7b7' : '#fca5a5',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{batchOutputMode === 'combine' ? '🎞️' : '⚡'}</span>
                          <div style={{ lineHeight: 1.4 }}>
                            {batchOutputMode === 'combine' ? (
                              <>
                                <strong>1-Click Full Movie Merger:</strong> All <strong>{targetBatchCount} videos</strong> will be processed (transcribed, Khmer AI dubbed, subtitles burned) and then <strong>automatically stitched into 1 seamless full movie video</strong>!
                              </>
                            ) : (
                              <>
                                <strong>Batch Auto-Pilot:</strong> Will sequentially transcribe, generate Khmer AI voiceover, mute foreign dialogue, burn subtitles, and save all <strong>{targetBatchCount} selected videos</strong> directly into your chosen folder.
                              </>
                            )}
                          </div>
                        </div>

                        {/* If combine mode is active, allow customizing the combined filename */}
                        {batchOutputMode === 'combine' && (
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Combined Master Video Name:
                            </label>
                            <input
                              type="text"
                              value={combinedTitle}
                              onChange={(e) => setCombinedTitle(e.target.value)}
                              placeholder="e.g. Series_Full_Movie.mp4"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-base)',
                                color: 'var(--text-bright)',
                                fontSize: '12px',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Subtitle Styling & Live Preview Card */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Type size={15} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)' }}>
                        Subtitle Styling & Live Preview
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {subtitleMode === 'none' ? 'Subtitles Off' : `${fontSize}px • ${position.toUpperCase()}`}
                    </span>
                  </div>

                  {/* Simulated Video Live Preview Screen */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '125px',
                      backgroundColor: '#0a0d14',
                      backgroundImage: 'radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 85%)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      userSelect: 'none'
                    }}
                  >
                    {/* Top-left label */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '8px',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 2
                      }}
                    >
                      <Eye size={10} />
                      <span>LIVE PREVIEW</span>
                    </div>

                    {/* Optional Watermark Preview */}
                    {addLogoWatermark && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          zIndex: 2
                        }}
                      >
                        <img src="/logo.png" alt="MK" style={{ width: '11px', height: '11px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '8px', color: '#ef4444', fontWeight: 700 }}>MK MOVIE</span>
                      </div>
                    )}

                    {subtitleMode === 'none' ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '6px 12px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#fca5a5',
                          fontSize: '11px',
                          textAlign: 'center',
                          zIndex: 1
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>🚫 Clean Video (No Subtitles Burned)</span>
                        <span style={{ fontSize: '9px', color: '#f87171' }}>
                          Khmer AI voiceover + BGM embedded with zero burnt text.
                        </span>
                      </div>
                    ) : (
                      <div
                        className="font-khmer"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          fontFamily: fontName ? `"${fontName}", var(--font-khmer), sans-serif` : 'var(--font-khmer)',
                          transform: position === 'middle' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
                          ...(position === 'top'
                            ? { top: `${Math.max(6, Math.min(45, Math.round(verticalOffset * 0.32)))}px` }
                            : position === 'middle'
                            ? { top: '50%' }
                            : { bottom: `${Math.max(6, Math.min(45, Math.round(verticalOffset * 0.32)))}px` }
                          ),
                          backgroundColor: stylePreset === 'box_dark'
                            ? 'rgba(0, 0, 0, 0.92)'
                            : 'rgba(0, 0, 0, 0.72)',
                          color: stylePreset === 'modern_yellow'
                            ? '#facc15'
                            : '#ffffff',
                          fontSize: `${Math.max(11, Math.round(fontSize * 0.62))}px`,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textAlign: 'center',
                          maxWidth: '88%',
                          lineHeight: 1.3,
                          boxShadow: stylePreset === 'box_dark' ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                          textShadow: stylePreset === 'classic_white'
                            ? '1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000'
                            : '1px 1px 2px rgba(0,0,0,0.8)',
                          pointerEvents: 'none',
                          transition: 'all 0.12s ease-out',
                          zIndex: 1
                        }}
                      >
                        {sampleSubtitleText}
                      </div>
                    )}
                  </div>

                  {/* 1. Subtitle Mode Switcher */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
                      Subtitle Mode:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'khmer', label: '🇰🇭 Khmer Subtitles' },
                        { id: 'original', label: '🇨🇳 Original Text' },
                        { id: 'none', label: '🚫 Clean (No Subs)' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => updateSettings({ subtitleMode: mode.id })}
                          style={{
                            padding: '7px 4px',
                            borderRadius: '6px',
                            border: `1px solid ${subtitleMode === mode.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            backgroundColor: subtitleMode === mode.id ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-base)',
                            color: subtitleMode === mode.id ? '#ffffff' : 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size & Position Controls (Visible when not 'none') */}
                  {subtitleMode !== 'none' && (
                    <>
                      {/* Font Family Selector (Local PC Fonts) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Type size={12} style={{ color: '#38bdf8' }} /> Font Family (Local PC):
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {systemFonts.khmer && systemFonts.khmer.length > 0 && (
                              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                                ✓ {systemFonts.khmer.length} Khmer PC Fonts
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomFont(!isCustomFont);
                                if (!isCustomFont) setCustomFontInput(fontName);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#38bdf8',
                                fontSize: '10px',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: 0
                              }}
                            >
                              {isCustomFont ? 'Choose from list' : 'Custom name'}
                            </button>
                          </div>
                        </div>

                        {isCustomFont ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={customFontInput}
                              onChange={(e) => setCustomFontInput(e.target.value)}
                              placeholder="Type font name installed on PC (e.g. Khmer OS Battambang)"
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                fontSize: '11px',
                                backgroundColor: 'var(--bg-base)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                color: 'var(--text-bright)',
                                outline: 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (customFontInput.trim()) {
                                  setFontName(customFontInput.trim());
                                  updateSettings({ fontName: customFontInput.trim() });
                                }
                              }}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '11px' }}
                            >
                              Apply
                            </button>
                          </div>
                        ) : (
                          <select
                            value={fontName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFontName(val);
                              updateSettings({ fontName: val });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: '11px',
                              backgroundColor: 'var(--bg-base)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-bright)',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {/* Optgroup: Khmer Fonts installed on PC */}
                            {systemFonts.khmer && systemFonts.khmer.length > 0 && (
                              <optgroup label={`🇰🇭 Local Khmer Fonts (${systemFonts.khmer.length})`}>
                                {systemFonts.khmer.map((fn) => (
                                  <option key={fn} value={fn}>
                                    {fn}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            {/* Optgroup: Popular System Fonts */}
                            {systemFonts.popular && systemFonts.popular.length > 0 && (
                              <optgroup label="💻 Popular System Fonts">
                                {systemFonts.popular.map((fn) => (
                                  <option key={fn} value={fn}>
                                    {fn}
                                  </option>
                                ))}
                              </optgroup>
                            )}

                            {/* Optgroup: All Installed Fonts */}
                            {systemFonts.all && systemFonts.all.length > 0 && (
                              <optgroup label={`🌐 All Windows Fonts (${systemFonts.all.length})`}>
                                {systemFonts.all.map((fn) => (
                                  <option key={fn} value={fn}>
                                    {fn}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        )}

                        {/* Top Khmer Favorites Quick Buttons */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {[
                            'Kantumruy Pro',
                            'Khmer OS Siemreap',
                            'Khmer OS Battambang',
                            'Khmer OS Muol',
                            'Leelawadee UI'
                          ].map((fPreset) => {
                            const isChosen = fontName.toLowerCase() === fPreset.toLowerCase();
                            return (
                              <button
                                key={fPreset}
                                type="button"
                                onClick={() => {
                                  setFontName(fPreset);
                                  updateSettings({ fontName: fPreset });
                                }}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isChosen ? '#38bdf8' : 'var(--border-color)'}`,
                                  backgroundColor: isChosen ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-base)',
                                  color: isChosen ? '#38bdf8' : 'var(--text-muted)',
                                  fontSize: '10px',
                                  fontWeight: isChosen ? 600 : 400,
                                  cursor: 'pointer'
                                }}
                              >
                                {fPreset}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Font Size Slider & Quick Pills */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Text Size:
                          </label>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                            {fontSize}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="16"
                          max="60"
                          step="1"
                          value={fontSize}
                          onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginBottom: '6px' }}
                        />
                        {/* Quick Size Preset Pills */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { label: 'Small', size: 18 },
                            { label: 'Standard', size: 24 },
                            { label: 'Medium', size: 32 },
                            { label: 'Large', size: 42 },
                            { label: 'Extra', size: 54 }
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => updateSettings({ fontSize: preset.size })}
                              style={{
                                flex: 1,
                                padding: '4px 4px',
                                borderRadius: '4px',
                                border: `1px solid ${fontSize === preset.size ? '#f59e0b' : 'var(--border-color)'}`,
                                backgroundColor: fontSize === preset.size ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-base)',
                                color: fontSize === preset.size ? '#f59e0b' : 'var(--text-muted)',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {preset.label} ({preset.size}px)
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Position Selector & Vertical Offset */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {/* Position */}
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Position:
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                            {[
                              { id: 'bottom', label: 'Bottom' },
                              { id: 'middle', label: 'Middle' },
                              { id: 'top', label: 'Top' }
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => updateSettings({ position: pos.id })}
                                style={{
                                  padding: '5px 2px',
                                  borderRadius: '4px',
                                  border: `1px solid ${position === pos.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                  backgroundColor: position === pos.id ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-base)',
                                  color: position === pos.id ? '#ffffff' : 'var(--text-muted)',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Vertical Offset */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Margin:
                            </label>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-bright)' }}>
                              {verticalOffset}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="120"
                            step="5"
                            value={verticalOffset}
                            onChange={(e) => updateSettings({ verticalOffset: parseInt(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                        </div>
                      </div>

                      {/* Subtitle Visual Style */}
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Visual Preset:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                          {[
                            { id: 'modern_yellow', label: 'Cinematic Yellow' },
                            { id: 'classic_white', label: 'Classic White' },
                            { id: 'box_dark', label: 'Dark Boxed' }
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setStylePreset(st.id);
                                updateSettings({ stylePreset: st.id });
                              }}
                              style={{
                                padding: '6px 4px',
                                borderRadius: '6px',
                                border: `1px solid ${stylePreset === st.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                backgroundColor: stylePreset === st.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-base)',
                                color: stylePreset === st.id ? '#fff' : 'var(--text-muted)',
                                fontSize: '10px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

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
                  <button onClick={onClose} className="btn-secondary" disabled={isProcessing || isBatchRendering}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const options = {
                        subtitle_style: stylePreset,
                        font_name: fontName,
                        font_size: fontSize,
                        subtitle_position: position,
                        vertical_offset: verticalOffset,
                        subtitle_mode: subtitleMode,
                        burn_subtitles: subtitleMode !== 'none',
                        use_translation: subtitleMode === 'khmer',
                        include_dubbing: includeDubbing,
                        mute_original_audio: includeDubbing ? muteOriginalAudio : false,
                        add_logo_watermark: addLogoWatermark,
                        background_ducking_volume: duckingVol / 100,
                        use_amf_gpu: useAmfGpu,
                        combine_into_one: renderScope === 'batch' && batchOutputMode === 'combine',
                        combined_filename: combinedTitle || 'Combined_Full_Movie.mp4',
                        batch_output_mode: batchOutputMode
                      };
                      if (renderScope === 'batch' && onBatchRender) {
                        onBatchRender(options);
                        onClose();
                      } else {
                        onRenderBurn(options);
                      }
                    }}
                    className="btn-primary"
                    disabled={isProcessing || isBatchRendering}
                    style={{
                      background: renderScope === 'batch'
                        ? (batchOutputMode === 'combine'
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)')
                        : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                      boxShadow: renderScope === 'batch'
                        ? (batchOutputMode === 'combine'
                            ? '0 4px 14px rgba(16, 185, 129, 0.4)'
                            : '0 4px 14px rgba(239, 68, 68, 0.4)')
                        : '0 4px 14px rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <Flame size={14} />
                    {renderScope === 'batch'
                      ? (isBatchRendering
                          ? 'Batch Rendering...'
                          : batchOutputMode === 'combine'
                            ? `Render & Combine into 1 Video (${targetBatchCount} Videos)`
                            : `Start Batch Render (${targetBatchCount} Videos)`)
                      : (isProcessing ? 'Rendering in background...' : downloadResult ? 'Re-render Video (Burn New Style)' : 'Start Rendering (1 Video)')}
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
