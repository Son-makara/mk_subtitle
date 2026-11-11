import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Layers,
  Settings,
  Flame,
  Square,
  Keyboard,
  FolderPlus
} from 'lucide-react';
import { formatTime } from '../utils/time_formatter';

export default function VideoQueueSidebar({
  queue = [],
  activeVideoId = null,
  onSelectVideo,
  onUploadVideos,
  onRemoveVideo,
  onClearQueue,
  onBatchProcessAll,
  isBatchProcessing = false,
  onOpenSettings,
  onBatchRenderAll,
  isBatchRendering = false,
  onCancelBatch,
  onOpenShortcuts
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Tick box selection state for queue items
  const [selectedQueueIds, setSelectedQueueIds] = useState(() => queue.map((v) => v.id));

  // Sync selectedQueueIds when queue changes (keep checked and add newly uploaded items)
  useEffect(() => {
    setSelectedQueueIds((prev) => {
      const validIds = new Set(queue.map((v) => v.id));
      const preserved = prev.filter((id) => validIds.has(id));
      const newIds = queue.map((v) => v.id).filter((id) => !prev.includes(id));
      return [...preserved, ...newIds];
    });
  }, [queue]);

  const isAllSelected = queue.length > 0 && selectedQueueIds.length === queue.length;
  const isSomeSelected = selectedQueueIds.length > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedQueueIds([]);
    } else {
      setSelectedQueueIds(queue.map((v) => v.id));
    }
  };

  const toggleSelectVideo = (id) => {
    setSelectedQueueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFilesChosen = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const videoFiles = Array.from(e.target.files).filter((f) =>
        f.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|flv|m4v|ts)$/i.test(f.name)
      );
      if (videoFiles.length > 0) {
        // Natural sort by filename so S01E001, S01E002, ..., S01E060 are strictly ordered
        videoFiles.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
        onUploadVideos(videoFiles);
      }
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const videoFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|flv|m4v|ts)$/i.test(f.name)
      );
      if (videoFiles.length > 0) {
        videoFiles.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
        onUploadVideos(videoFiles);
      }
    }
  };

  // Status Badge with guaranteed dimensions
  const renderStatusBadge = (item) => {
    const badgeBase = {
      fontSize: '10px',
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      lineHeight: 1.2
    };

    const hasSubs = item.subtitles && item.subtitles.length > 0;
    const hasVoice = hasSubs && item.subtitles.some((s) => s.audio_url || s.audio_status === 'ready');

    switch (item.status) {
      case 'completed':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: hasVoice ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: hasVoice ? '#34d399' : '#fcd34d',
              border: `1px solid ${hasVoice ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}
          >
            {hasVoice ? 'Voice Ready 🎙️' : 'Subs Ready 📝'}
          </span>
        );
      case 'transcribing':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <RefreshCw size={9} className="animate-spin" /> STT {item.progress ? `${item.progress}%` : ''}
          </span>
        );
      case 'translating':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: '#fcd34d',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <RefreshCw size={9} className="animate-spin" /> Translating
          </span>
        );
      case 'dubbing':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}
          >
            <RefreshCw size={9} className="animate-spin" /> TTS {item.progress ? `${item.progress}%` : ''}
          </span>
        );
      case 'rendered':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}
          >
            Rendered 🎬
          </span>
        );
      case 'rendering':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: '#fcd34d',
              border: '1px solid rgba(245, 158, 11, 0.4)'
            }}
          >
            <RefreshCw size={9} className="animate-spin" /> Render {item.progress ? `${item.progress}%` : ''}
          </span>
        );
      case 'uploading':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            <RefreshCw size={9} className="animate-spin" /> Uploading
          </span>
        );
      case 'error':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
            title={item.errorMessage || 'Failed'}
          >
            <AlertCircle size={9} /> Error
          </span>
        );
      default:
        if (hasVoice) {
          return (
            <span
              style={{
                ...badgeBase,
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              Voice Ready 🎙️
            </span>
          );
        }
        if (hasSubs) {
          return (
            <span
              style={{
                ...badgeBase,
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#fcd34d',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
            >
              Subs Only 📝
            </span>
          );
        }
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: '#374151',
              color: '#9ca3af'
            }}
          >
            Not yet run ⏳
          </span>
        );
    }
  };

  // Progress Bar for active operations
  const renderProgressBar = (item) => {
    if (!['uploading', 'transcribing', 'dubbing', 'rendering'].includes(item.status)) {
      return null;
    }
    const color =
      item.status === 'transcribing'
        ? '#3b82f6'
        : item.status === 'dubbing'
        ? '#a855f7'
        : item.status === 'rendering'
        ? '#f59e0b'
        : '#ef4444';

    return (
      <div
        style={{
          width: '100%',
          backgroundColor: '#1f2937',
          height: '3px',
          borderRadius: '999px',
          overflow: 'hidden',
          marginTop: '6px'
        }}
      >
        <div
          style={{
            backgroundColor: color,
            height: '100%',
            width: `${Math.max(10, item.progress || 25)}%`,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    );
  };

  // Collapsed Sidebar Mode
  if (isCollapsed) {
    return (
      <aside
        style={{
          width: '50px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: '10px',
          flexShrink: 0,
          transition: 'width 0.2s ease, background-color 0.2s ease',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-hover)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Expand Video Queue"
        >
          <ChevronRight size={16} />
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-hover)',
            border: '1px solid var(--border-light)',
            color: 'var(--accent-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Studio Settings & Themes (ប្តូរ Theme)"
        >
          <Settings size={15} />
        </button>

        <button
          onClick={onOpenShortcuts}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-hover)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Keyboard Shortcuts Cheat Sheet (?)"
        >
          <Keyboard size={15} />
        </button>

        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Add Video(s)"
        >
          <Plus size={16} />
        </button>

        <button
          onClick={() => folderInputRef.current && folderInputRef.current.click()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Add Drama/Series Folder (Auto-loads all episodes)"
        >
          <FolderPlus size={15} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFilesChosen}
        />

        <input
          type="file"
          ref={folderInputRef}
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleFilesChosen}
        />

        <div style={{ width: '24px', height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 0' }} />

        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '0 4px'
          }}
        >
          {queue.map((item, idx) => {
            const isActive = item.id === activeVideoId;
            return (
              <button
                key={item.id}
                onClick={() => onSelectVideo(item.id)}
                style={{
                  position: 'relative',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'rgba(239, 68, 68, 0.2)' : '#1f2937',
                  border: isActive ? '1px solid #ef4444' : '1px solid #374151',
                  color: isActive ? '#ef4444' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={`${idx + 1}. ${item.name} (${item.status})`}
              >
                <Film size={14} />
                {item.status === 'completed' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981'
                    }}
                  />
                )}
                {['transcribing', 'dubbing', 'rendering'].includes(item.status) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6'
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
          {queue.length}
        </div>
      </aside>
    );
  }

  // Expanded Sidebar Mode (Clean exact mockup layout)
  return (
    <aside
      style={{
        width: '270px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease, background-color 0.2s ease',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-panel)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}
          >
            Video Queue
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-primary)',
              padding: '1px 6px',
              borderRadius: '10px',
              border: '1px solid var(--border-light)'
            }}
          >
            {queue.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={onOpenSettings}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--accent-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Studio Settings & Themes (ប្តូរ Theme)"
          >
            <Settings size={13} />
          </button>
          <button
            onClick={onOpenShortcuts}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Keyboard Shortcuts Cheat Sheet (?)"
          >
            <Keyboard size={13} />
          </button>
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Add Video File(s)"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => folderInputRef.current && folderInputRef.current.click()}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Add Drama/Series Folder (Auto-loads all episodes)"
          >
            <FolderPlus size={13} />
          </button>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Clear queue"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* 2. Drag & Drop Multi-Upload Zone */}
      <div style={{ padding: '10px' }}>
        <label
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: '2px dashed #374151',
            borderRadius: '10px',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            transition: 'border-color 0.15s ease'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFilesChosen}
          />
          <input
            type="file"
            ref={folderInputRef}
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: 'none' }}
            onChange={handleFilesChosen}
          />
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Upload size={16} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', textAlign: 'center' }}>
            Drop Multi-Videos Here
          </span>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>
            MP4, MKV, MOV (Batch)
          </span>
        </label>
      </div>

      {/* 3. Batch Mode Processing Controls Bar */}
      <div
        style={{
          padding: '0 10px 8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9ca3af',
          borderBottom: '1px solid #1f2937'
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: queue.length === 0 ? 'not-allowed' : 'pointer',
            userSelect: 'none'
          }}
          title={isAllSelected ? 'Deselect all videos' : 'Select all videos'}
        >
          <input
            type="checkbox"
            checked={isAllSelected}
            disabled={queue.length === 0}
            onChange={toggleSelectAll}
            style={{
              accentColor: '#ef4444',
              cursor: queue.length === 0 ? 'not-allowed' : 'pointer',
              width: '13px',
              height: '13px'
            }}
          />
          <span style={{ color: selectedQueueIds.length > 0 ? '#e5e7eb' : '#6b7280', fontWeight: 600, fontSize: '10px' }}>
            {selectedQueueIds.length === queue.length && queue.length > 0
              ? `All (${queue.length})`
              : `${selectedQueueIds.length}/${queue.length}`}
          </span>
        </label>

        {isBatchProcessing || isBatchRendering ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
              <RefreshCw size={10} className="animate-spin" />
              {isBatchRendering ? 'Rendering...' : 'Processing...'}
            </span>
            {onCancelBatch && (
              <button
                onClick={onCancelBatch}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#f87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Stop batch processing"
              >
                <Square size={9} fill="#f87171" /> Stop
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onBatchProcessAll(selectedQueueIds)}
              disabled={queue.length === 0 || selectedQueueIds.length === 0}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: selectedQueueIds.length > 0 ? '#c084fc' : '#6b7280',
                backgroundColor: selectedQueueIds.length > 0 ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                padding: '3px 6px',
                borderRadius: '5px',
                border: selectedQueueIds.length > 0 ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                cursor: selectedQueueIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.15s ease'
              }}
              title="Run Whisper STT, Khmer translation & Edge-TTS Dubbing for selected"
            >
              🎙️ Dub ({selectedQueueIds.length})
            </button>

            <button
              onClick={() => onBatchRenderAll && onBatchRenderAll(selectedQueueIds)}
              disabled={queue.length === 0 || selectedQueueIds.length === 0}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: selectedQueueIds.length > 0 ? '#ffffff' : '#6b7280',
                background: selectedQueueIds.length > 0 ? 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)' : '#374151',
                padding: '3px 8px',
                borderRadius: '5px',
                border: 'none',
                cursor: selectedQueueIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: selectedQueueIds.length > 0 ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="One-Click Batch Render: Auto STT + TTS + Burn Subtitles & Mute foreign voice -> Export MP4s to folder"
            >
              <Flame size={10} /> Render ({selectedQueueIds.length})
            </button>
          </div>
        )}
      </div>

      {/* 4. Video Queue Items List */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {queue.length === 0 ? (
          <div
            style={{
              height: '140px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#6b7280',
              padding: '12px'
            }}
          >
            <Film size={26} style={{ marginBottom: '8px', opacity: 0.4, color: '#9ca3af' }} />
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>No videos in queue</p>
            <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
              Drop videos above to start batch processing.
            </p>
          </div>
        ) : (
          queue.map((item) => {
            const isActive = item.id === activeVideoId;
            const isChecked = selectedQueueIds.includes(item.id);
            const subCount = item.subtitles ? item.subtitles.length : 0;
            const formattedDuration = item.duration ? formatTime(item.duration).slice(3) : '--:--';

            return (
              <div
                key={item.id}
                onClick={() => onSelectVideo(item.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: isActive
                    ? '1px solid #ef4444'
                    : isChecked
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid #1f2937',
                  backgroundColor: isActive
                    ? 'rgba(239, 68, 68, 0.12)'
                    : isChecked
                    ? 'rgba(17, 24, 39, 0.85)'
                    : 'rgba(17, 24, 39, 0.45)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isChecked ? 1 : 0.65
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    {/* Tick box for selecting video to run */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectVideo(item.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        accentColor: '#ef4444',
                        cursor: 'pointer',
                        width: '15px',
                        height: '15px',
                        flexShrink: 0
                      }}
                      title={isChecked ? 'Uncheck to skip in batch run' : 'Check to include in batch run'}
                    />

                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: isActive ? 'rgba(239, 68, 68, 0.25)' : '#1f2937',
                        color: isActive ? '#ef4444' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Film size={13} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isActive ? '#ffffff' : isChecked ? '#e5e7eb' : '#9ca3af',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <p style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace', marginTop: '1px' }}>
                        {formattedDuration} • {subCount} lines
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    {renderStatusBadge(item)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveVideo(item.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '1px'
                      }}
                      title="Remove from queue"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {renderProgressBar(item)}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #1f2937',
          fontSize: '11px',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0b101c'
        }}
      >
        <span>Click video to edit</span>
        <span style={{ color: '#34d399', fontFamily: 'monospace' }}>100% Free / Local</span>
      </div>
    </aside>
  );
}
