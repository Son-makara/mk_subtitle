import React, { useRef } from 'react';
import { FileText, Users, Volume2, Loader2, AlertCircle, Languages, Sparkles } from 'lucide-react';
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
  isTranslating
}) {
  const lastSelectedIndexRef = useRef(null);

  const isAllSelected = subtitles.length > 0 && selectedIds.length >= subtitles.length;

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectIds(subtitles.map((s) => s.id));
    } else {
      onSelectIds([]);
    }
  };

  const handleRowClick = (item, index, e) => {
    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(index, lastSelectedIndexRef.current);
      const end = Math.max(index, lastSelectedIndexRef.current);
      const sliceIds = subtitles.slice(start, end + 1).map((s) => s.id);
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
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({subtitles.length} lines{selectedIds.length > 0 && selectedIds.length < subtitles.length ? ` • ${selectedIds.length} selected` : ''})
            </span>
          )}
        </div>

        {/* Right Side Actions: Google Translate & Voice Selection */}
        {subtitles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                onClick={() => onTranslateClick && onTranslateClick()}
                disabled={isTranslating}
                style={{
                  padding: '5px 12px',
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
                    ? `Translate ${selectedIds.length} selected lines to Khmer`
                    : 'Translate all subtitles to Khmer with Google Translate'
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
                  : 'Google Translate to Khmer'}
              </button>

              {/* Advanced Translation Options (AIModal) */}
              {onOpenTranslateModal && (
                <button
                  onClick={onOpenTranslateModal}
                  disabled={isTranslating}
                  style={{
                    padding: '5px 8px',
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
                <Users size={13} /> Set voices:
              </span>
              <button
                onClick={() => onSetAllVoices('Male')}
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '10px', color: '#818cf8', borderColor: '#334155' }}
                title="Set all voice profiles to Male"
              >
                Male
              </button>
              <button
                onClick={() => onSetAllVoices('Female')}
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '10px', color: '#f472b6', borderColor: '#334155' }}
                title="Set all voice profiles to Female"
              >
                Female
              </button>
            </div>
          </div>
        )}
      </div>

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
                      padding: '48px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}
                  >
                    No subtitle data loaded. Import an SRT file or click Transcribe to generate.
                  </td>
                </tr>
              ) : (
                subtitles.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isActive = currentTime >= item.start_time && currentTime <= item.end_time;
                  const isPlayingThis = playingAudioId === item.id;
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
                          : isSelected
                          ? 'var(--bg-hover)'
                          : 'transparent',
                        borderLeft: isPlayingThis
                          ? '2px solid #10b981'
                          : isSelected
                          ? '2px solid var(--accent-primary)'
                          : '2px solid transparent',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive && !isSelected && !isPlayingThis) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive && !isSelected && !isPlayingThis) {
                          e.currentTarget.style.backgroundColor = 'transparent';
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
                            accentColor: 'var(--accent-primary)',
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
                              Male
                            </option>
                            <option value="Female" style={{ color: '#f472b6', backgroundColor: '#0f172a' }}>
                              Female
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Audio Status Column (Exact DAI-Dubber Speaker Button!) */}
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontSize: '12px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.audio_status === 'generating' ? (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-text)' }} />
                          </div>
                        ) : item.audio_url || item.audio_status === 'ready' ? (
                          <button
                            onClick={() => onPlayAudioItem(item)}
                            style={{
                              padding: '6px',
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
                            onMouseEnter={(e) => {
                              if (!isPlayingThis) {
                                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                                e.currentTarget.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isPlayingThis) {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                e.currentTarget.style.color = 'var(--accent-text)';
                              }
                            }}
                            title={isPlayingThis ? 'Playing... Click to stop' : 'Click to preview audio'}
                          >
                            <Volume2 size={14} />
                          </button>
                        ) : item.audio_status === 'error' ? (
                          <span style={{ color: '#f87171', fontSize: '11px' }}>Error</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pending</span>
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
