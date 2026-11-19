import React, { useRef, useState, useMemo } from 'react';
import {
  FileText,
  Users,
  Volume2,
  Loader2,
  AlertCircle,
  Languages,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';
import { formatTime } from '../utils/time_formatter';

export default function SubtitleDataTable({
  subtitles,
  selectedIds,
  onSelectIds,
  onUpdateSubtitle,
  onSetAllVoices,
  currentTime,
  onSeekTime,
  onPlayAudioItem,
  playingAudioId,
  onTranslateClick,
  onOpenTranslateModal,
  isTranslating,
  onGenerateAudioClick,
  isGeneratingAudio = false,
  ttsEngine = 'edge-tts',
  onTtsEngineChange,
  onSubtitleUpload,
  onOpenWhisperModal,
  hasVideoLoaded
}) {
  const lastSelectedIndexRef = useRef(null);
  const subFileInputRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ready' | 'error' | 'pending' | 'generating'

  // Calculate audio status counts
  const statusCounts = useMemo(() => {
    let ready = 0;
    let error = 0;
    let generating = 0;
    let pending = 0;

    subtitles.forEach((s) => {
      if (s.audio_status === 'generating') {
        generating++;
      } else if (s.audio_url || s.audio_status === 'ready') {
        ready++;
      } else if (s.audio_status === 'error') {
        error++;
      } else {
        pending++;
      }
    });

    return { ready, error, generating, pending, total: subtitles.length };
  }, [subtitles]);

  // Filter subtitles based on active audio status tab
  const filteredSubtitles = useMemo(() => {
    if (statusFilter === 'all') return subtitles;
    if (statusFilter === 'ready') {
      return subtitles.filter((s) => s.audio_url || s.audio_status === 'ready');
    }
    if (statusFilter === 'error') {
      return subtitles.filter((s) => s.audio_status === 'error');
    }
    if (statusFilter === 'pending') {
      return subtitles.filter(
        (s) =>
          !s.audio_url &&
          s.audio_status !== 'ready' &&
          s.audio_status !== 'error' &&
          s.audio_status !== 'generating'
      );
    }
    if (statusFilter === 'generating') {
      return subtitles.filter((s) => s.audio_status === 'generating');
    }
    return subtitles;
  }, [subtitles, statusFilter]);

  const isAllSelected =
    filteredSubtitles.length > 0 &&
    filteredSubtitles.every((s) => selectedIds.includes(s.id));

  const handleSelectAll = (checked) => {
    if (checked) {
      const newSelected = Array.from(
        new Set([...selectedIds, ...filteredSubtitles.map((s) => s.id)])
      );
      onSelectIds(newSelected);
    } else {
      const filteredIdSet = new Set(filteredSubtitles.map((s) => s.id));
      onSelectIds(selectedIds.filter((id) => !filteredIdSet.has(id)));
    }
  };

  const handleSelectErrors = () => {
    const errorIds = subtitles
      .filter((s) => s.audio_status === 'error')
      .map((s) => s.id);
    if (errorIds.length > 0) {
      onSelectIds(errorIds);
    }
  };

  const handleRetryErrors = () => {
    const errorIds = subtitles
      .filter((s) => s.audio_status === 'error')
      .map((s) => s.id);
    if (errorIds.length === 0) return;
    onSelectIds(errorIds);
    if (onGenerateAudioClick) {
      onGenerateAudioClick('selected');
    }
  };

  const handleRetrySingle = (item, e) => {
    e.stopPropagation();
    onSelectIds([item.id]);
    if (onGenerateAudioClick) {
      onGenerateAudioClick('selected', ttsEngine);
    }
  };

  const handleRowClick = (item, index, e) => {
    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(index, lastSelectedIndexRef.current);
      const end = Math.max(index, lastSelectedIndexRef.current);
      const sliceIds = filteredSubtitles.slice(start, end + 1).map((s) => s.id);
      onSelectIds(Array.from(new Set([...selectedIds, ...sliceIds])));
    } else if (e.ctrlKey || e.metaKey) {
      onSelectIds((prev) =>
        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
      );
      lastSelectedIndexRef.current = index;
    } else {
      onSelectIds([item.id]);
      lastSelectedIndexRef.current = index;
    }
    onSeekTime(item.start_time);
  };

  const handleCheckboxClick = (itemId, e) => {
    e.stopPropagation();
    onSelectIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: '14px',
        backgroundColor: 'var(--bg-base)'
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          padding: '0 4px',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        {/* Title & Stats */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} /> Subtitle Data
          {subtitles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({subtitles.length} lines{selectedIds.length > 0 && selectedIds.length < subtitles.length ? ` • ${selectedIds.length} selected` : ''})
              </span>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectIds([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: '0 2px',
                    textDecoration: 'underline'
                  }}
                  title="Deselect all rows"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side Actions: Google Translate, Generate Audio & Voice Selection */}
        {subtitles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Google Translate Button Group */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
              }}
            >
              <button
                type="button"
                onClick={() => onTranslateClick && onTranslateClick(selectedIds.length > 0 && selectedIds.length < subtitles.length ? 'selected' : 'all')}
                disabled={isTranslating}
                style={{
                  padding: '6px 11px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: isTranslating ? '#1d4ed8' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  cursor: isTranslating ? 'not-allowed' : 'pointer',
                  opacity: isTranslating ? 0.75 : 1,
                  transition: 'background-color 0.15s ease'
                }}
                title={
                  selectedIds.length > 0 && selectedIds.length < subtitles.length
                    ? `Translate ${selectedIds.length} selected lines to Khmer with Google Translate`
                    : `Translate all ${subtitles.length} lines to Khmer with Google Translate`
                }
              >
                {isTranslating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Languages size={13} />
                )}
                {isTranslating
                  ? 'Translating...'
                  : selectedIds.length > 0 && selectedIds.length < subtitles.length
                  ? `Translate Selected (${selectedIds.length})`
                  : `Google Translate to Khmer (${subtitles.length})`}
              </button>

              {/* If subset selected, provide a quick 'All' translation shortcut */}
              {selectedIds.length > 0 && selectedIds.length < subtitles.length && (
                <button
                  type="button"
                  onClick={() => onTranslateClick && onTranslateClick('all')}
                  disabled={isTranslating}
                  style={{
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: '#1d4ed8',
                    color: '#bfdbfe',
                    border: 'none',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                    cursor: isTranslating ? 'not-allowed' : 'pointer'
                  }}
                  title={`Translate all ${subtitles.length} lines to Khmer`}
                >
                  All ({subtitles.length})
                </button>
              )}

              {/* Advanced Translation Options (AIModal) */}
              {onOpenTranslateModal && (
                <button
                  type="button"
                  onClick={onOpenTranslateModal}
                  disabled={isTranslating}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    backgroundColor: isTranslating ? '#1e40af' : '#1d4ed8',
                    color: '#bfdbfe',
                    border: 'none',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: isTranslating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Advanced AI Translation Settings (Gemini API & Languages)"
                >
                  <Sparkles size={12} />
                </button>
              )}
            </div>

            {/* Clear Separation: Online (Edge-TTS Cloud) vs Offline (Meta MMS Local) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                padding: '3px 4px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)'
              }}
            >
              {/* Button 1: 🌐 Generate Online (Piseth/Sreymom Natural Studio Voice) */}
              <button
                type="button"
                onClick={() => {
                  if (onTtsEngineChange) onTtsEngineChange('edge-tts');
                  if (onGenerateAudioClick) onGenerateAudioClick(selectedIds.length > 0 && selectedIds.length < subtitles.length ? 'selected' : 'all', 'edge-tts');
                }}
                disabled={isGeneratingAudio || subtitles.length === 0}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px',
                  border: ttsEngine === 'edge-tts' ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.4)',
                  backgroundColor: isGeneratingAudio && ttsEngine === 'edge-tts'
                    ? '#1d4ed8'
                    : ttsEngine === 'edge-tts'
                    ? '#2563eb'
                    : 'rgba(37, 99, 235, 0.2)',
                  color: '#ffffff',
                  cursor: isGeneratingAudio || subtitles.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingAudio || subtitles.length === 0 ? 0.65 : 1,
                  boxShadow: ttsEngine === 'edge-tts' ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Microsoft Cloud Neural Voice (Piseth & Sreymom) - Natural studio quality, highly recommended!"
              >
                {isGeneratingAudio && ttsEngine === 'edge-tts' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Volume2 size={13} />
                )}
                <span>
                  🌐 Piseth / Sreymom ({selectedIds.length > 0 && selectedIds.length < subtitles.length ? selectedIds.length : subtitles.length})
                </span>
                <span style={{ fontSize: '9px', opacity: 0.95, padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.3)', fontWeight: 700, color: '#93c5fd' }}>
                  Best
                </span>
              </button>

              {/* Button 2: ⚡ Generate Offline (Meta MMS Khmer 100% Local PC) */}
              <button
                type="button"
                onClick={() => {
                  if (onTtsEngineChange) onTtsEngineChange('mms-offline');
                  if (onGenerateAudioClick) onGenerateAudioClick(selectedIds.length > 0 && selectedIds.length < subtitles.length ? 'selected' : 'all', 'mms-offline');
                }}
                disabled={isGeneratingAudio || subtitles.length === 0}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '6px',
                  border: ttsEngine === 'mms-offline' ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.2)',
                  backgroundColor: isGeneratingAudio && ttsEngine === 'mms-offline'
                    ? '#047857'
                    : ttsEngine === 'mms-offline'
                    ? '#059669'
                    : 'rgba(16, 185, 129, 0.08)',
                  color: ttsEngine === 'mms-offline' ? '#ffffff' : '#6ee7b7',
                  cursor: isGeneratingAudio || subtitles.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingAudio || subtitles.length === 0 ? 0.65 : 0.85,
                  transition: 'all 0.15s ease'
                }}
                title="Meta MMS-TTS Khmer (100% Offline, runs locally on PC - Robotic fallback)"
              >
                {isGeneratingAudio && ttsEngine === 'mms-offline' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                <span>
                  ⚡ Offline ({selectedIds.length > 0 && selectedIds.length < subtitles.length ? selectedIds.length : subtitles.length})
                </span>
                <span style={{ fontSize: '9px', opacity: 0.75, padding: '1px 4px', borderRadius: '3px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  Robotic
                </span>
              </button>
            </div>

            {/* Set All Voices */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginLeft: '4px' }}>
              <span
                style={{
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Users size={13} /> Set all:
              </span>
              <button
                type="button"
                onClick={() => onSetAllVoices('Male')}
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '10px', color: '#818cf8', borderColor: '#334155' }}
                title="Set all voice profiles to Piseth (Male)"
              >
                Piseth (Male)
              </button>
              <button
                onClick={() => onSetAllVoices('Female')}
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '10px', color: '#f472b6', borderColor: '#334155' }}
                title="Set all voice profiles to Sreymom (Female)"
              >
                Sreymom (Female)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio Status & Filter Helper Bar */}
      {subtitles.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            marginBottom: '8px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          {/* Left: Filter Tabs with dynamic counters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginRight: '2px'
              }}
            >
              <Filter size={12} /> Filter:
            </span>

            {/* All */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: statusFilter === 'all' ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === 'all' ? 'var(--accent-primary)' : 'var(--border-color)',
                backgroundColor: statusFilter === 'all' ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                color: statusFilter === 'all' ? 'var(--accent-text)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              All <span style={{ opacity: 0.7, fontSize: '10px' }}>({statusCounts.total})</span>
            </button>

            {/* Ready */}
            <button
              type="button"
              onClick={() => setStatusFilter('ready')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: statusFilter === 'ready' ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === 'ready' ? '#10b981' : 'var(--border-color)',
                backgroundColor: statusFilter === 'ready' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: statusFilter === 'ready' ? '#34d399' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Show only lines with ready audio"
            >
              <CheckCircle2 size={12} style={{ color: '#10b981' }} />
              Ready <span style={{ opacity: 0.7, fontSize: '10px' }}>({statusCounts.ready})</span>
            </button>

            {/* Errors - prominently highlighted if > 0 */}
            <button
              type="button"
              onClick={() => setStatusFilter('error')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: statusFilter === 'error' || statusCounts.error > 0 ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid',
                borderColor:
                  statusFilter === 'error'
                    ? '#ef4444'
                    : statusCounts.error > 0
                    ? 'rgba(239, 68, 68, 0.5)'
                    : 'var(--border-color)',
                backgroundColor:
                  statusFilter === 'error'
                    ? 'rgba(239, 68, 68, 0.25)'
                    : statusCounts.error > 0
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'transparent',
                color: statusCounts.error > 0 ? '#f87171' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: statusCounts.error > 0 ? '0 0 6px rgba(239, 68, 68, 0.2)' : 'none'
              }}
              title="Filter to show only failed audio lines"
            >
              <AlertCircle size={12} style={{ color: '#ef4444' }} />
              Errors{' '}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: statusCounts.error > 0 ? '#ef4444' : 'inherit'
                }}
              >
                ({statusCounts.error})
              </span>
            </button>

            {/* Pending */}
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: statusFilter === 'pending' ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === 'pending' ? '#eab308' : 'var(--border-color)',
                backgroundColor: statusFilter === 'pending' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                color: statusFilter === 'pending' ? '#facc15' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Show only lines pending audio generation"
            >
              <Clock size={12} style={{ color: '#eab308' }} />
              Pending <span style={{ opacity: 0.7, fontSize: '10px' }}>({statusCounts.pending})</span>
            </button>

            {/* Generating (if active) */}
            {statusCounts.generating > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('generating')}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--accent-primary)',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-text)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Loader2 size={12} className="animate-spin" />
                Generating ({statusCounts.generating})
              </button>
            )}

            {/* Show all shortcut if filter is active */}
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  textDecoration: 'underline'
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Right: Quick Error Actions if errors exist */}
          {statusCounts.error > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleSelectErrors}
                style={{
                  padding: '4px 9px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: 'transparent',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Select all lines with audio errors"
              >
                Select Errors ({statusCounts.error})
              </button>

              <button
                type="button"
                onClick={handleRetryErrors}
                disabled={isGeneratingAudio}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: isGeneratingAudio ? '#991b1b' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isGeneratingAudio ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                  transition: 'background-color 0.15s ease'
                }}
                title="Immediately retry generating audio for all failed lines"
              >
                <RotateCcw size={12} className={isGeneratingAudio ? 'animate-spin' : ''} />
                Retry Failed ({statusCounts.error})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
          <table
            style={{
              width: '100%',
              textAlign: 'left',
              borderCollapse: 'collapse',
              fontSize: '13px',
              position: 'relative'
            }}
          >
            {/* Table Head */}
            <thead
              style={{
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                textTransform: 'uppercase',
                fontWeight: 600,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              <tr>
                <th
                  style={{
                    padding: '12px 10px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '40px',
                    textAlign: 'center'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={subtitles.length === 0}
                    style={{
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer',
                      accentColor: 'var(--accent-primary)'
                    }}
                  />
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '96px',
                    letterSpacing: '0.05em'
                  }}
                >
                  Start
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '96px',
                    letterSpacing: '0.05em'
                  }}
                >
                  End
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    letterSpacing: '0.05em'
                  }}
                >
                  Khmer Text (Editable)
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '128px',
                    letterSpacing: '0.05em'
                  }}
                >
                  Voice Profile
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    width: '80px',
                    textAlign: 'center',
                    letterSpacing: '0.05em'
                  }}
                >
                  Audio Status
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {subtitles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '420px', margin: '0 auto' }}>
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8'
                        }}
                      >
                        <FileText size={24} />
                      </div>
                      
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-bright)' }}>
                        No Subtitles Loaded Yet
                      </div>
                      
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        Import an existing subtitle file (.srt, .vtt) or use AI Whisper STT to automatically detect and transcribe speech from your video.
                      </div>

                      <input
                        ref={subFileInputRef}
                        type="file"
                        accept=".srt,.vtt,.ass"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0] && onSubtitleUpload) {
                            onSubtitleUpload(e.target.files[0]);
                          }
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => subFileInputRef.current && subFileInputRef.current.click()}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '6px',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#fbbf24',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <FileText size={13} style={{ color: '#f59e0b' }} />
                          <span>Import SRT File</span>
                        </button>

                        {onOpenWhisperModal && (
                          <button
                            type="button"
                            onClick={onOpenWhisperModal}
                            disabled={!hasVideoLoaded}
                            style={{
                              padding: '7px 14px',
                              borderRadius: '6px',
                              border: !hasVideoLoaded ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.4)',
                              backgroundColor: !hasVideoLoaded ? 'var(--bg-elevated)' : 'rgba(239, 68, 68, 0.15)',
                              color: !hasVideoLoaded ? 'var(--text-muted)' : '#f87171',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: !hasVideoLoaded ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                            title={!hasVideoLoaded ? 'Load a video first to extract subtitles' : 'Extract speech from video using Whisper AI'}
                          >
                            <Sparkles size={13} style={{ color: !hasVideoLoaded ? 'var(--text-muted)' : '#ef4444' }} />
                            <span>Auto-Sub with Whisper AI</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredSubtitles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: '48px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span>No subtitle lines match the "{statusFilter}" audio status.</span>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '11px', marginTop: '4px' }}
                      >
                        Show All Lines ({subtitles.length})
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubtitles.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isActive = currentTime >= item.start_time && currentTime <= item.end_time;
                  const isPlayingThis = playingAudioId === item.id;
                  const isError = item.audio_status === 'error';
                  const displayText = item.translated_text || item.text;

                  return (
                    <tr
                      key={item.id}
                      onClick={(e) => handleRowClick(item, index, e)}
                      style={{
                        backgroundColor: isPlayingThis
                          ? 'rgba(16, 185, 129, 0.15)'
                          : isActive
                          ? 'rgba(79, 70, 229, 0.2)'
                          : isError
                          ? 'rgba(239, 68, 68, 0.08)'
                          : isSelected
                          ? 'var(--bg-hover)'
                          : 'transparent',
                        borderLeft: isPlayingThis
                          ? '3px solid #10b981'
                          : isError
                          ? '3px solid #ef4444'
                          : isSelected
                          ? '3px solid var(--accent-primary)'
                          : '3px solid transparent',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive && !isSelected && !isPlayingThis) {
                          e.currentTarget.style.backgroundColor = isError
                            ? 'rgba(239, 68, 68, 0.14)'
                            : 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive && !isSelected && !isPlayingThis) {
                          e.currentTarget.style.backgroundColor = isError
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'transparent';
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleCheckboxClick(item.id, e)}
                          style={{
                            width: '14px',
                            height: '14px',
                            cursor: 'pointer',
                            accentColor: isError ? '#ef4444' : 'var(--accent-primary)',
                            opacity: isSelected ? 1 : 0.6
                          }}
                        />
                      </td>

                      {/* Start Time */}
                      <td
                        style={{
                          padding: '8px 16px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)'
                        }}
                      >
                        {formatTime(item.start_time)}
                      </td>

                      {/* End Time */}
                      <td
                        style={{
                          padding: '8px 16px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)'
                        }}
                      >
                        {formatTime(item.end_time)}
                      </td>

                      {/* Editable Khmer Text */}
                      <td style={{ padding: '8px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={displayText}
                          onChange={(e) => {
                            if (item.translated_text !== undefined && item.translated_text !== null) {
                              onUpdateSubtitle(item.id, { translated_text: e.target.value });
                            } else {
                              onUpdateSubtitle(item.id, { text: e.target.value });
                            }
                          }}
                          className="font-khmer"
                          style={{
                            width: '100%',
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px',
                            letterSpacing: '0.02em',
                            color: isActive ? 'var(--text-bright)' : 'var(--text-primary)',
                            padding: '4px 6px',
                            borderRadius: '4px'
                          }}
                          onFocus={(e) => {
                            e.target.style.backgroundColor = 'var(--bg-base)';
                            e.target.style.boxShadow = '0 0 0 2px var(--accent-primary)';
                          }}
                          onBlur={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </td>

                      {/* Voice Profile Dropdown */}
                      <td style={{ padding: '8px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <select
                            value={item.gender || 'Female'}
                            onChange={(e) => onUpdateSubtitle(item.id, { gender: e.target.value })}
                            style={{
                              backgroundColor: 'var(--bg-base)',
                              border: '1px solid var(--border-light)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              padding: '3px 8px',
                              outline: 'none',
                              fontWeight: 500,
                              cursor: 'pointer',
                              color: item.gender === 'Female' ? '#f472b6' : '#818cf8'
                            }}
                          >
                            <option value="Male" style={{ color: '#818cf8', backgroundColor: '#0f172a' }}>
                              Piseth (Male)
                            </option>
                            <option value="Female" style={{ color: '#f472b6', backgroundColor: '#0f172a' }}>
                              Sreymom (Female)
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Audio Status Column */}
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontSize: '12px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.audio_status === 'generating' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
                          </div>
                        ) : item.audio_url || item.audio_status === 'ready' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              onClick={() => onPlayAudioItem(item)}
                              style={{
                                padding: '5px 7px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: isPlayingThis ? '#10b981' : 'var(--bg-hover)',
                                color: isPlayingThis ? '#fff' : 'var(--accent-text)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              title={isPlayingThis ? 'Playing... Click to stop' : 'Click to preview audio'}
                            >
                              <Volume2 size={13} />
                            </button>
                            <span
                              style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: item.audio_engine === 'mms-offline' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                color: item.audio_engine === 'mms-offline' ? '#34d399' : '#60a5fa',
                                border: item.audio_engine === 'mms-offline' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                              }}
                              title={item.audio_engine === 'mms-offline' ? 'Meta MMS Khmer (Offline Engine)' : 'Microsoft Edge-TTS (Cloud Neural Voice)'}
                            >
                              {item.audio_engine === 'mms-offline' ? '⚡ Local' : '🌐 Cloud'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleRetrySingle(item, e)}
                              disabled={isGeneratingAudio}
                              style={{
                                padding: '4px 5px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-light)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: isGeneratingAudio ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Re-generate voice (${ttsEngine === 'mms-offline' ? '⚡ Offline' : '🌐 Online'})`}
                            >
                              <RotateCcw size={11} />
                            </button>
                          </div>
                        ) : isError ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}
                              title="Audio generation failed"
                            >
                              <AlertCircle size={11} /> Error
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleRetrySingle(item, e)}
                              disabled={isGeneratingAudio}
                              style={{
                                padding: '3px 4px',
                                borderRadius: '4px',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#fca5a5',
                                cursor: isGeneratingAudio ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isGeneratingAudio) {
                                  e.currentTarget.style.backgroundColor = '#ef4444';
                                  e.currentTarget.style.color = '#fff';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isGeneratingAudio) {
                                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                  e.currentTarget.style.color = '#fca5a5';
                                }
                              }}
                              title={`Retry voice generation (${ttsEngine === 'mms-offline' ? '⚡ Offline' : '🌐 Online'})`}
                            >
                              <RotateCcw size={11} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={(e) => handleRetrySingle(item, e)}
                              disabled={isGeneratingAudio}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-light)',
                                backgroundColor: 'var(--bg-hover)',
                                color: 'var(--text-muted)',
                                cursor: isGeneratingAudio ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Generate audio for this line (${ttsEngine === 'mms-offline' ? '⚡ Offline MMS' : '🌐 Online Cloud'})`}
                            >
                              <Volume2 size={11} style={{ color: item.gender === 'Female' ? '#f472b6' : '#818cf8' }} />
                              <span>Dub</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
