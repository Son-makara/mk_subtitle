import React, { useState, useEffect, useRef } from 'react';
import { Download, Flame, X, Check, FileText, FolderCheck, HardDrive, Trash2, Type, Sliders, Eye, Upload, Image as ImageIcon, Layers, ArrowUp, ArrowDown, Plus, Film, Loader2, FolderOpen, Play, CheckCircle2, Shield, EyeOff, Music, Sparkles } from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState(type || 'burn');

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    }
  }, [type, isOpen]);

  // Merge Video Files State
  const [mergeFiles, setMergeFiles] = useState([]);
  const [mergeOutputTitle, setMergeOutputTitle] = useState('');
  const [isUploadingMerge, setIsUploadingMerge] = useState(false);
  const [mergeUploadStatus, setMergeUploadStatus] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeStatusText, setMergeStatusText] = useState('');
  const [mergeResult, setMergeResult] = useState(null);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportedFilesList, setExportedFilesList] = useState([]);
  const mergeFileInputRef = useRef(null);

  // Auto-populate merge files from queue if empty
  useEffect(() => {
    if (activeTab === 'merge' && mergeFiles.length === 0 && queue && queue.length > 0) {
      const initial = queue.map((v, i) => ({
        id: 'q_' + (v.id || i),
        name: v.name || v.serverFilename || `Episode_${i + 1}`,
        filename: v.serverFilename || v.name,
        source: 'queue',
        sizeMb: null
      }));
      setMergeFiles(initial);
    }
  }, [activeTab, queue]);

  // Default merge title from combinedTitle or first video
  useEffect(() => {
    if (!mergeOutputTitle) {
      if (combinedTitle) {
        setMergeOutputTitle(combinedTitle);
      } else if (queue && queue.length > 0) {
        const first = queue[0].name || queue[0].serverFilename || 'Series';
        const cleanStem = first.replace(/\.[^/.]+$/, '').replace(/_dubbed$/, '');
        setMergeOutputTitle(`${cleanStem}_Merged_Full_Movie.mp4`);
      } else {
        setMergeOutputTitle('Combined_Full_Movie.mp4');
      }
    }
  }, [combinedTitle, queue, mergeOutputTitle]);

  const handleUploadLocalMergeFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploadingMerge(true);
    setMergeUploadStatus(`Uploading ${files.length} local file(s)...`);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setMergeUploadStatus(`Uploading (${i + 1}/${files.length}): ${file.name}`);
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          setMergeFiles((prev) => [
            ...prev,
            {
              id: 'loc_' + Math.random().toString(36).substr(2, 9),
              name: file.name,
              filename: data.filename,
              source: 'local',
              sizeMb: file.size ? (file.size / (1024 * 1024)).toFixed(1) : null
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to upload local merge video:', err);
      alert('Upload error: ' + err.message);
    } finally {
      setIsUploadingMerge(false);
      setMergeUploadStatus('');
    }
  };

  const handleAddFromQueue = () => {
    const queueItems = queue.map((v, i) => ({
      id: 'q_' + (v.id || i) + '_' + Math.random().toString(36).substr(2, 4),
      name: v.name || v.serverFilename || `Episode_${i + 1}`,
      filename: v.serverFilename || v.name,
      source: 'queue',
      sizeMb: null
    }));
    setMergeFiles((prev) => {
      const existingFilenames = new Set(prev.map((p) => p.filename));
      const newItems = queueItems.filter((q) => !existingFilenames.has(q.filename));
      return [...prev, ...newItems];
    });
  };

  const handleFetchExports = async () => {
    try {
      const res = await fetch('/api/exports/list');
      if (res.ok) {
        const data = await res.json();
        setExportedFilesList(data.files || []);
        setShowExportPicker(true);
      }
    } catch (e) {
      console.warn('Failed to fetch exports:', e);
    }
  };

  const handleSelectExportedFile = (ef) => {
    setMergeFiles((prev) => [
      ...prev,
      {
        id: 'exp_' + Math.random().toString(36).substr(2, 9),
        name: ef.name,
        filename: ef.filename,
        source: 'export',
        sizeMb: ef.size_mb
      }
    ]);
    setShowExportPicker(false);
  };

  const moveMergeItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= mergeFiles.length) return;
    const updated = [...mergeFiles];
    const [removed] = updated.splice(index, 1);
    updated.splice(newIndex, 0, removed);
    setMergeFiles(updated);
  };

  const removeMergeItem = (id) => {
    setMergeFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleExecuteMerge = async () => {
    if (mergeFiles.length < 2) {
      alert('Please select at least 2 video files to merge.');
      return;
    }
    setIsMerging(true);
    setMergeProgress(10);
    setMergeStatusText('Preparing to merge videos...');
    const jobId = 'concat_' + Math.random().toString(36).substr(2, 9);

    const pollInterval = setInterval(async () => {
      try {
        const pRes = await fetch(`/api/render/progress/${jobId}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.progress) setMergeProgress(pData.progress);
          if (pData.message) setMergeStatusText(pData.message);
        }
      } catch (e) {}
    }, 800);

    try {
      const res = await fetch('/api/render/concat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_filenames: mergeFiles.map((f) => f.filename || f.name),
          custom_output_filename: mergeOutputTitle || 'Combined_Full_Movie.mp4',
          job_id: jobId
        })
      });
      clearInterval(pollInterval);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Concatenation failed');
      }
      const data = await res.json();
      setMergeProgress(100);
      setMergeResult(data);
      setMergeStatusText('Merge completed successfully!');
    } catch (err) {
      clearInterval(pollInterval);
      alert('Video merge failed: ' + err.message);
    } finally {
      setIsMerging(false);
    }
  };

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
  const [smartDucking, setSmartDucking] = useState(true);
  const [useAmfGpu, setUseAmfGpu] = useState(true);
  const [addLogoWatermark, setAddLogoWatermark] = useState(false);
  const [watermarkSource, setWatermarkSource] = useState('default'); // 'default' | 'custom'
  const [customLogoUrl, setCustomLogoUrl] = useState(null);
  const [customLogoFile, setCustomLogoFile] = useState(null);
  const [customLogoPath, setCustomLogoPath] = useState(null);
  const [watermarkPosition, setWatermarkPosition] = useState('top_right'); // 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left'
  const [watermarkSize, setWatermarkSize] = useState(90); // 40 - 220 px
  const [watermarkOpacity, setWatermarkOpacity] = useState(85); // 20 - 100%
  const [watermarkMargin, setWatermarkMargin] = useState(20); // 10 - 60 px
  const [autoPurgeCache, setAutoPurgeCache] = useState(true);

  // 1. Delogo / Foreign Subtitles Cover Strip
  const [enableDelogo, setEnableDelogo] = useState(false);
  const [delogoMode, setDelogoMode] = useState('blur'); // 'blur' | 'black_bar'
  const [delogoArea, setDelogoArea] = useState('bottom_subtitles'); // 'bottom_subtitles' | 'top_banner'
  const [delogoHeightPct, setDelogoHeightPct] = useState(14); // 8 - 30%

  // 2. Anti-Copyright Safe Shield (Content-ID Bypass)
  const [enableAntiCopyright, setEnableAntiCopyright] = useState(false);
  const [antiCopyrightFlip, setAntiCopyrightFlip] = useState(true);
  const [antiCopyrightZoom, setAntiCopyrightZoom] = useState(1.03); // 1.01 - 1.08
  const [antiCopyrightColor, setAntiCopyrightColor] = useState(true);
  const [antiCopyrightSpeed, setAntiCopyrightSpeed] = useState(1.03); // 1.01 - 1.08

  // 7. Endless BGM Auto-Crossfader & Cinematic Fader
  const [bgmCrossfade, setBgmCrossfade] = useState(true);
  const [bgmFadeIn, setBgmFadeIn] = useState(2.0); // seconds
  const [bgmFadeOut, setBgmFadeOut] = useState(3.0); // seconds

  const logoFileInputRef = React.useRef(null);

  const handleCustomLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomLogoFile(file);
    const localPreview = URL.createObjectURL(file);
    setCustomLogoUrl(localPreview);
    setWatermarkSource('custom');

    // Pre-upload to backend so path is ready immediately
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setCustomLogoPath(data.filename);
      }
    } catch (err) {
      console.warn('Could not pre-upload custom logo:', err);
    }
  };

  const activeLogoSrc = watermarkSource === 'custom' && customLogoUrl ? customLogoUrl : '/logo.png';

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/logo.png" alt="MK" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #ef4444' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-bright)' }}>
                MK Studio Tools
              </h3>
            </div>

            {/* Mode Tabs */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-base)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('burn')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeTab === 'burn' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: activeTab === 'burn' ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Flame size={12} style={{ color: activeTab === 'burn' ? '#ef4444' : 'inherit' }} />
                <span>Burn Video</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subs')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeTab === 'subs' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  color: activeTab === 'subs' ? '#06b6d4' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FileText size={12} />
                <span>Export Subs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('merge')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeTab === 'merge' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: activeTab === 'merge' ? '#38bdf8' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Layers size={12} />
                <span>Merge Files</span>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'burn' && downloadResult && (
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

        {activeTab === 'merge' ? (
          /* ================= Merge / Concat Files Form ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner / Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8'
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-bright)' }}>
                    Direct Video Merger & Combiner
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Stitch multiple video files into 1 full movie video without re-encoding everything from scratch.
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                {mergeFiles.length} {mergeFiles.length === 1 ? 'Video' : 'Videos'}
              </div>
            </div>

            {/* Success Result View if merge finished */}
            {mergeResult && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#34d399', fontWeight: 600, fontSize: '14px' }}>
                  <CheckCircle2 size={18} />
                  <span>Merged Video Successfully Created!</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-bright)', wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                  {mergeResult.export_filename}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch('/api/exports/open-folder', { method: 'POST' });
                      } catch (e) {
                        console.warn(e);
                      }
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FolderCheck size={14} style={{ color: '#34d399' }} />
                    <span>Open in Folder</span>
                  </button>
                  <a
                    href={mergeResult.download_url}
                    download={mergeResult.export_filename}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} />
                    <span>Download Merged Video</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setMergeResult(null)}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Merge Another Set
                  </button>
                </div>
              </div>
            )}

            {/* Action Toolbar to Add Files */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="file"
                multiple
                accept="video/*"
                ref={mergeFileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadLocalMergeFiles(Array.from(e.target.files));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => mergeFileInputRef.current?.click()}
                disabled={isUploadingMerge || isMerging}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              >
                {isUploadingMerge ? <Loader2 size={13} className="animate-spin" /> : <FolderOpen size={13} />}
                <span>+ Select Any Video File(s)</span>
              </button>

              {queue && queue.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddFromQueue}
                  disabled={isMerging}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px' }}
                  title="Add all videos currently in the studio queue"
                >
                  <Film size={13} style={{ color: '#f59e0b' }} />
                  <span>+ Add from Queue ({queue.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFetchExports}
                disabled={isMerging}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px' }}
                title="Choose from rendered dubbed export videos"
              >
                <FolderCheck size={13} style={{ color: '#34d399' }} />
                <span>+ Add from Rendered Exports</span>
              </button>

              {mergeFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMergeFiles([])}
                  disabled={isMerging}
                  className="btn-secondary"
                  style={{ marginLeft: 'auto', fontSize: '11px', color: '#f87171', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Uploading Status Banner */}
            {isUploadingMerge && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '12px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{mergeUploadStatus || 'Uploading local videos to studio...'}</span>
              </div>
            )}

            {/* Export Picker Dropdown */}
            {showExportPicker && (
              <div style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-bright)' }}>Choose Rendered Video to Add:</span>
                  <button type="button" onClick={() => setShowExportPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                </div>
                {exportedFilesList.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px', textAlign: 'center' }}>No exported videos found in storage/exports yet.</div>
                ) : (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {exportedFilesList.map((ef) => (
                      <button
                        key={ef.filename}
                        type="button"
                        onClick={() => handleSelectExportedFile(ef)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-bright)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ef.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0, marginLeft: '8px' }}>{ef.size_mb} MB</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reorderable Videos Sequence List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Playback Order Sequence ({mergeFiles.length} items):
                </label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Use ▲ ▼ to adjust playback sequence</span>
              </div>

              {mergeFiles.length === 0 ? (
                <div
                  style={{
                    padding: '30px 16px',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-muted)',
                    backgroundColor: 'rgba(255,255,255,0.01)'
                  }}
                >
                  <Layers size={28} style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>No videos selected for merging yet.</div>
                  <div style={{ fontSize: '11px' }}>Click <strong>"+ Select Any Video File(s)"</strong> above to pick videos from your computer, or add from your studio queue.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {mergeFiles.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px'
                      }}
                    >
                      {/* Order number badge */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                          flexShrink: 0
                        }}
                      >
                        #{idx + 1}
                      </div>

                      {/* Title & Source */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <span style={{ textTransform: 'uppercase', color: item.source === 'export' ? '#34d399' : item.source === 'queue' ? '#f59e0b' : '#38bdf8' }}>
                            ● {item.source}
                          </span>
                          {item.sizeMb && <span>• {item.sizeMb} MB</span>}
                        </div>
                      </div>

                      {/* Move Up / Down Buttons */}
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => moveMergeItem(idx, -1)}
                          disabled={idx === 0 || isMerging}
                          className="btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '10px', opacity: idx === 0 ? 0.3 : 1 }}
                          title="Move Up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMergeItem(idx, 1)}
                          disabled={idx === mergeFiles.length - 1 || isMerging}
                          className="btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '10px', opacity: idx === mergeFiles.length - 1 ? 0.3 : 1 }}
                          title="Move Down"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeMergeItem(item.id)}
                        disabled={isMerging}
                        className="btn-secondary"
                        style={{ padding: '3px 6px', color: '#f87171' }}
                        title="Remove from merge list"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Combined Master File Name Setting */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Output Video Filename:
              </label>
              <input
                type="text"
                value={mergeOutputTitle}
                onChange={(e) => setMergeOutputTitle(e.target.value)}
                placeholder="Combined_Master_Video.mp4"
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '8px 12px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Merging Progress Bar */}
            {isMerging && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#38bdf8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={12} className="animate-spin" />
                    <span>{mergeStatusText || 'Stitching video files...'}</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>{mergeProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${mergeProgress}%`, height: '100%', backgroundColor: '#38bdf8', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button onClick={onClose} className="btn-secondary" disabled={isMerging}>
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={mergeFiles.length < 2 || isMerging || isUploadingMerge}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  minWidth: '180px',
                  justifyContent: 'center'
                }}
              >
                {isMerging ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Merging Videos ({mergeProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Layers size={14} />
                    <span>Merge ({mergeFiles.length} Videos)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : activeTab === 'subs' ? (
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

                {/* Subtitle Font & Style Info Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: '8px'
                  }}
                >
                  <Type size={16} style={{ color: '#38bdf8' }} />
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Subtitle Font: </span>
                    <strong style={{ color: '#38bdf8' }}>{fontName}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> ({fontSize}px • {stylePreset === 'modern_yellow' ? 'Yellow' : stylePreset === 'box_dark' ? 'Dark Box' : 'White'})</span>
                  </div>
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
                        zIndex: 3
                      }}
                    >
                      <Eye size={10} />
                      <span>LIVE PREVIEW</span>
                    </div>

                    {/* Anti-Copyright Shield Active indicator badge */}
                    {enableAntiCopyright && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: addLogoWatermark && watermarkPosition === 'top_right' ? '75px' : '8px',
                          fontSize: '8px',
                          color: '#34d399',
                          backgroundColor: 'rgba(5, 150, 105, 0.25)',
                          border: '1px solid rgba(5, 150, 105, 0.45)',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          zIndex: 3,
                          fontWeight: 600,
                          pointerEvents: 'none'
                        }}
                      >
                        <Shield size={9} />
                        <span>SAFE SHIELD ({antiCopyrightSpeed}x)</span>
                      </div>
                    )}

                    {/* Delogo Strip Live Preview */}
                    {enableDelogo && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          ...(delogoArea === 'top_banner'
                            ? { top: 0, height: `${Math.max(10, Math.min(35, delogoHeightPct))}%` }
                            : { bottom: 0, height: `${Math.max(10, Math.min(35, delogoHeightPct))}%` }),
                          backgroundColor: delogoMode === 'black_bar' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(30, 41, 59, 0.82)',
                          backdropFilter: delogoMode === 'blur' ? 'blur(8px)' : 'none',
                          borderTop: delogoArea === 'bottom_subtitles' ? '1px dashed #f59e0b' : 'none',
                          borderBottom: delogoArea === 'top_banner' ? '1px dashed #f59e0b' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}
                      >
                        <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.5px' }}>
                          {delogoMode === 'blur' ? '🌫️ DELOGO BLUR STRIP' : '⬛ CINEMA COVER STRIP'}
                        </span>
                      </div>
                    )}

                    {/* Watermark Live Preview with custom position, size, opacity */}
                    {addLogoWatermark && (
                      <div
                        style={{
                          position: 'absolute',
                          ...(watermarkPosition === 'top_left'
                            ? { top: `${Math.round(watermarkMargin * 0.25)}px`, left: `${Math.round(watermarkMargin * 0.25)}px` }
                            : watermarkPosition === 'bottom_left'
                            ? { bottom: `${Math.round(watermarkMargin * 0.25)}px`, left: `${Math.round(watermarkMargin * 0.25)}px` }
                            : watermarkPosition === 'bottom_right'
                            ? { bottom: `${Math.round(watermarkMargin * 0.25)}px`, right: `${Math.round(watermarkMargin * 0.25)}px` }
                            : { top: `${Math.round(watermarkMargin * 0.25)}px`, right: `${Math.round(watermarkMargin * 0.25)}px` }),
                          opacity: watermarkOpacity / 100,
                          zIndex: 2,
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: watermarkSource === 'default' ? 'rgba(0,0,0,0.45)' : 'transparent',
                          padding: watermarkSource === 'default' ? '2px 4px' : '0',
                          borderRadius: '4px'
                        }}
                      >
                        <img
                          src={activeLogoSrc}
                          alt="Watermark"
                          style={{
                            width: `${Math.max(12, Math.round(watermarkSize * 0.22))}px`,
                            height: 'auto',
                            maxHeight: `${Math.max(12, Math.round(watermarkSize * 0.22))}px`,
                            objectFit: 'contain',
                            borderRadius: watermarkSource === 'default' ? '50%' : '2px'
                          }}
                        />
                        {watermarkSource === 'default' && (
                          <span style={{ fontSize: '7px', color: '#ef4444', fontWeight: 700 }}>MK</span>
                        )}
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
                          zIndex: 2
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
                    <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-bright)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={smartDucking}
                          onChange={(e) => setSmartDucking(e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px' }}
                        />
                        <span style={{ fontWeight: 600 }}>Smart Dynamic Auto-Ducking (FFmpeg Sidechain)</span>
                      </label>
                      <div
                        style={{
                          fontSize: '11px',
                          color: smartDucking ? '#6ee7b7' : 'var(--text-muted)',
                          backgroundColor: smartDucking ? 'rgba(5, 150, 105, 0.12)' : 'rgba(255,255,255,0.03)',
                          padding: '6px 10px',
                          borderRadius: '6px'
                        }}
                      >
                        {smartDucking
                          ? `✓ Lowers background audio down to ${duckingVol}% only when AI voice is speaking; smoothly swells back to 100% during pauses.`
                          : `Static reduction: Background audio permanently lowered to ${duckingVol}% throughout the video.`}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Ducked Voiceover Volume Level:</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-text)' }}>{duckingVol}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
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

                  {/* Endless BGM Auto-Crossfader & Cinematic Fader */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={bgmCrossfade}
                        onChange={(e) => setBgmCrossfade(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px' }}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: bgmCrossfade ? 600 : 400 }}>
                        <Music size={15} style={{ color: '#818cf8' }} />
                        Endless BGM Auto-Crossfader & Smooth Fade In/Out
                      </span>
                    </label>

                    {bgmCrossfade && (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ color: '#a5b4fc', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '6px 8px', borderRadius: '5px' }}>
                          ✓ Seamlessly loops BGM with {bgmFadeIn}s intro fade-in and {bgmFadeOut}s cinematic fade-out at video conclusion.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Fade-In Time:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{bgmFadeIn}s</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="5.0"
                              step="0.5"
                              value={bgmFadeIn}
                              onChange={(e) => setBgmFadeIn(parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Fade-Out Time:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{bgmFadeOut}s</span>
                            </div>
                            <input
                              type="range"
                              min="1.0"
                              max="6.0"
                              step="0.5"
                              value={bgmFadeOut}
                              onChange={(e) => setBgmFadeOut(parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={addLogoWatermark}
                        onChange={(e) => setAddLogoWatermark(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: addLogoWatermark ? 600 : 400 }}>
                        <img src={activeLogoSrc} alt="Logo" style={{ width: '15px', height: '15px', borderRadius: watermarkSource === 'default' ? '50%' : '3px', objectFit: 'contain' }} />
                        Add Watermark Logo ({watermarkSource === 'custom' ? 'Custom Logo' : 'MK Movie'})
                      </span>
                    </label>

                    {/* Expandable Custom Watermark Controls */}
                    {addLogoWatermark && (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* 1. Logo Image Source Selector */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>WATERMARK LOGO IMAGE:</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setWatermarkSource('default');
                                setCustomLogoFile(null);
                                setCustomLogoUrl(null);
                                setCustomLogoPath(null);
                              }}
                              style={{
                                padding: '8px',
                                borderRadius: '6px',
                                border: `1px solid ${watermarkSource === 'default' ? '#ef4444' : 'var(--border-color)'}`,
                                backgroundColor: watermarkSource === 'default' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                                color: watermarkSource === 'default' ? '#ffffff' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <img src="/logo.png" alt="MK" style={{ width: '15px', height: '15px', borderRadius: '50%' }} />
                              <span>Default MK Logo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => logoFileInputRef.current && logoFileInputRef.current.click()}
                              style={{
                                padding: '8px',
                                borderRadius: '6px',
                                border: `1px solid ${watermarkSource === 'custom' ? '#3b82f6' : 'var(--border-color)'}`,
                                backgroundColor: watermarkSource === 'custom' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                                color: watermarkSource === 'custom' ? '#60a5fa' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {customLogoUrl ? (
                                <img src={customLogoUrl} alt="Custom" style={{ width: '15px', height: '15px', borderRadius: '2px', objectFit: 'contain' }} />
                              ) : (
                                <Upload size={13} />
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {customLogoFile ? customLogoFile.name : 'Upload Custom Logo'}
                              </span>
                            </button>

                            <input
                              type="file"
                              ref={logoFileInputRef}
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              style={{ display: 'none' }}
                              onChange={handleCustomLogoSelect}
                            />
                          </div>
                        </div>

                        {/* 2. Position: 4 Corners */}
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                            CORNER POSITION:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {[
                              { id: 'top_left', label: 'Top-Left ↖' },
                              { id: 'top_right', label: 'Top-Right ↗' },
                              { id: 'bottom_left', label: 'Bottom-Left ↙' },
                              { id: 'bottom_right', label: 'Bottom-Right ↘' }
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => setWatermarkPosition(pos.id)}
                                style={{
                                  padding: '6px 4px',
                                  borderRadius: '6px',
                                  border: `1px solid ${watermarkPosition === pos.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                  backgroundColor: watermarkPosition === pos.id ? 'rgba(239, 68, 68, 0.18)' : 'var(--bg-tertiary)',
                                  color: watermarkPosition === pos.id ? '#ffffff' : 'var(--text-muted)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'center'
                                }}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Sliders: Size, Opacity, Margin */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Size:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{watermarkSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="220"
                              step="5"
                              value={watermarkSize}
                              onChange={(e) => setWatermarkSize(parseInt(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Opacity:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{watermarkOpacity}%</span>
                            </div>
                            <input
                              type="range"
                              min="20"
                              max="100"
                              step="5"
                              value={watermarkOpacity}
                              onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Margin:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{watermarkMargin}px</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="60"
                              step="2"
                              value={watermarkMargin}
                              onChange={(e) => setWatermarkMargin(parseInt(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tool 1: Delogo / Subtitle Cover Strip */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableDelogo}
                        onChange={(e) => setEnableDelogo(e.target.checked)}
                        style={{ accentColor: '#f59e0b', width: '14px', height: '14px' }}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: enableDelogo ? 600 : 400 }}>
                        <EyeOff size={15} style={{ color: '#f59e0b' }} />
                        Cover / Blur Old Foreign Subtitles (Delogo Strip)
                      </span>
                    </label>

                    {enableDelogo && (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ fontSize: '11px', color: '#fcd34d', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                          ✓ Places a blur or cinema matte bar over hardcoded foreign subtitles before burning your new Khmer text on top.
                        </div>

                        {/* Mode Selector */}
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                            COVER STYLE:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {[
                              { id: 'blur', label: '🌫️ Gaussian Blur (12px Box Blur)' },
                              { id: 'black_bar', label: '⬛ Cinema Matte Bar (85% Black)' }
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setDelogoMode(m.id)}
                                style={{
                                  padding: '7px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${delogoMode === m.id ? '#f59e0b' : 'var(--border-color)'}`,
                                  backgroundColor: delogoMode === m.id ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                                  color: delogoMode === m.id ? '#ffffff' : 'var(--text-muted)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'center'
                                }}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Position & Height */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                              TARGET LOCATION:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              {[
                                { id: 'bottom_subtitles', label: 'Bottom Subs' },
                                { id: 'top_banner', label: 'Top Banner' }
                              ].map((loc) => (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => setDelogoArea(loc.id)}
                                  style={{
                                    padding: '6px 4px',
                                    borderRadius: '6px',
                                    border: `1px solid ${delogoArea === loc.id ? '#f59e0b' : 'var(--border-color)'}`,
                                    backgroundColor: delogoArea === loc.id ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                                    color: delogoArea === loc.id ? '#ffffff' : 'var(--text-muted)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {loc.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Strip Height:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{delogoHeightPct}%</span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="28"
                              step="1"
                              value={delogoHeightPct}
                              onChange={(e) => setDelogoHeightPct(parseInt(e.target.value))}
                              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tool 2: Anti-Copyright Safe Shield */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableAntiCopyright}
                        onChange={(e) => setEnableAntiCopyright(e.target.checked)}
                        style={{ accentColor: '#10b981', width: '14px', height: '14px' }}
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: enableAntiCopyright ? 600 : 400 }}>
                        <Shield size={15} style={{ color: '#10b981' }} />
                        Anti-Copyright Safe Shield (TikTok / Reels / YouTube Bot Safe)
                      </span>
                    </label>

                    {enableAntiCopyright && (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-base)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ fontSize: '11px', color: '#6ee7b7', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                          🛡️ Multi-layer algorithmic transforms designed to bypass automated Content-ID audio/video fingerprinting bots while retaining cinema clarity.
                        </div>

                        {/* Options Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {/* 1. Horizontal Flip */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-bright)', cursor: 'pointer', backgroundColor: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '6px' }}>
                            <input
                              type="checkbox"
                              checked={antiCopyrightFlip}
                              onChange={(e) => setAntiCopyrightFlip(e.target.checked)}
                              style={{ accentColor: '#10b981' }}
                            />
                            <span>Horizontal Mirror Flip (hflip)</span>
                          </label>

                          {/* 2. Color Grading Matrix Shift */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-bright)', cursor: 'pointer', backgroundColor: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '6px' }}>
                            <input
                              type="checkbox"
                              checked={antiCopyrightColor}
                              onChange={(e) => setAntiCopyrightColor(e.target.checked)}
                              style={{ accentColor: '#10b981' }}
                            />
                            <span>Color Curve Shift (Histogram)</span>
                          </label>
                        </div>

                        {/* Sliders for Zoom & Speed */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Edge Micro-Zoom:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{Math.round(antiCopyrightZoom * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="108"
                              step="1"
                              value={Math.round(antiCopyrightZoom * 100)}
                              onChange={(e) => setAntiCopyrightZoom(parseFloat((parseInt(e.target.value) / 100).toFixed(2)))}
                              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                              <span>Audio/Video Pacing:</span>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{antiCopyrightSpeed}x (Pitch Safe)</span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="108"
                              step="1"
                              value={Math.round(antiCopyrightSpeed * 100)}
                              onChange={(e) => setAntiCopyrightSpeed(parseFloat((parseInt(e.target.value) / 100).toFixed(2)))}
                              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

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
                        watermark_custom_path: (watermarkSource === 'custom' && customLogoPath) ? customLogoPath : null,
                        watermark_custom_file: (watermarkSource === 'custom' && customLogoFile) ? customLogoFile : null,
                        watermark_position: watermarkPosition,
                        watermark_size: watermarkSize,
                        watermark_opacity: watermarkOpacity / 100,
                        watermark_margin: watermarkMargin,
                        background_ducking_volume: duckingVol / 100,
                        smart_ducking: smartDucking,
                        bgm_crossfade: bgmCrossfade,
                        bgm_fade_in: parseFloat(bgmFadeIn) || 2.0,
                        bgm_fade_out: parseFloat(bgmFadeOut) || 3.0,
                        enable_delogo: enableDelogo,
                        delogo_mode: delogoMode,
                        delogo_area: delogoArea,
                        delogo_height_pct: (parseFloat(delogoHeightPct) || 14) / 100,
                        enable_anti_copyright: enableAntiCopyright,
                        anti_copyright_flip: antiCopyrightFlip,
                        anti_copyright_zoom: parseFloat(antiCopyrightZoom) || 1.03,
                        anti_copyright_color: antiCopyrightColor,
                        anti_copyright_speed: parseFloat(antiCopyrightSpeed) || 1.03,
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
