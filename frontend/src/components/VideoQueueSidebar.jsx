import React, { useState, useRef } from 'react';
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
  Layers
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
  isBatchProcessing = false
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilesChosen = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadVideos(Array.from(e.target.files));
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
        f.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|flv|m4v)$/i.test(f.name)
      );
      if (videoFiles.length > 0) {
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

    switch (item.status) {
      case 'completed':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            Done ✅
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
      case 'rendering':
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: 'rgba(244, 63, 94, 0.2)',
              color: '#fda4af',
              border: '1px solid rgba(244, 63, 94, 0.3)'
            }}
          >
            <RefreshCw size={9} className="animate-spin" /> Burning
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
        return (
          <span
            style={{
              ...badgeBase,
              backgroundColor: '#374151',
              color: '#cbd5e1'
            }}
          >
            Ready
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
          backgroundColor: '#0e1422',
          borderRight: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: '10px',
          flexShrink: 0,
          transition: 'width 0.2s ease',
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
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            color: '#cbd5e1',
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

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFilesChosen}
        />

        <div style={{ width: '24px', height: '1px', backgroundColor: '#1f2937', margin: '2px 0' }} />

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
        backgroundColor: '#0e1422',
        borderRight: '1px solid #1f2937',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0b101c'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
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
              backgroundColor: '#1f2937',
              color: '#cbd5e1',
              padding: '1px 6px',
              borderRadius: '10px',
              border: '1px solid #374151'
            }}
          >
            {queue.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
            title="Add Video(s)"
          >
            <Plus size={14} />
          </button>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#9ca3af',
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
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: '#9ca3af',
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
          padding: '0 12px 8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9ca3af',
          borderBottom: '1px solid #1f2937'
        }}
      >
        <span>Processing: <strong style={{ color: '#e5e7eb' }}>Sequential (FIFO)</strong></span>
        <button
          onClick={onBatchProcessAll}
          disabled={isBatchProcessing || queue.length === 0}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isBatchProcessing ? '#6b7280' : '#ef4444',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: isBatchProcessing || queue.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isBatchProcessing ? (
            <>
              <RefreshCw size={10} className="animate-spin" /> Processing...
            </>
          ) : (
            'Run All ▶'
          )}
        </button>
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
            const subCount = item.subtitles ? item.subtitles.length : 0;
            const formattedDuration = item.duration ? formatTime(item.duration).slice(3) : '--:--';

            return (
              <div
                key={item.id}
                onClick={() => onSelectVideo(item.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #ef4444' : '1px solid #1f2937',
                  backgroundColor: isActive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(17, 24, 39, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
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
                          color: isActive ? '#ffffff' : '#e5e7eb',
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
