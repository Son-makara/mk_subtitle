import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, AudioWaveform, Trash2, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { formatTime } from '../utils/time_formatter';

export default function TimelineEditor({
  subtitles,
  selectedIds,
  onSelectIds,
  currentTime,
  onSeekTime,
  totalDuration,
  onTranscribeClick,
  onGenerateAudioClick,
  onUpdateSubtitle,
  onClearTrack,
  onPlayAudioItem,
  playingAudioId,
  isTranscribing,
  isGeneratingAudio
}) {
  const [zoom, setZoom] = useState(100);
  const [isMutedA1, setIsMutedA1] = useState(false);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const [resizingItem, setResizingItem] = useState(null);

  const duration = Math.max(totalDuration || 45.10, 10);

  // Time ruler ticks calculation
  const getRulerTicks = () => {
    const tickInterval = zoom >= 400 ? 1 : zoom >= 200 ? 2 : 5;
    const ticks = [];
    for (let t = 0; t <= duration + 5; t += tickInterval) {
      ticks.push(t);
    }
    return ticks;
  };

  const handleTimelineMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.resize-handle')) return;
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * duration;
    onSeekTime(targetTime);
  };

  const handleResizeStart = (item, e) => {
    e.stopPropagation();
    setResizingItem({ id: item.id, startX: e.clientX, origEnd: item.end_time });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingItem || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaSec = ((e.clientX - resizingItem.startX) / rect.width) * duration;
      const targetSub = subtitles.find((s) => s.id === resizingItem.id);
      if (targetSub) {
        const newEnd = Math.max(targetSub.start_time + 0.3, resizingItem.origEnd + deltaSec);
        onUpdateSubtitle(resizingItem.id, { end_time: parseFloat(newEnd.toFixed(2)) });
      }
    };

    const handleMouseUp = () => {
      if (resizingItem) setResizingItem(null);
    };

    if (resizingItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingItem, subtitles, duration, onUpdateSubtitle]);

  const selectedCount = selectedIds.length;

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-panel)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -10px 30px -15px rgba(0,0,0,0.5)',
        zIndex: 20,
        flexShrink: 0
      }}
    >
      {/* Top Timeline Bar Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-base)',
          fontSize: '12px'
        }}
      >
        {/* Left Side: Title & Zoom & Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-bright)', fontSize: '13px' }}>
            Timeline Editor
          </span>
          <div style={{ height: '14px', width: '1px', backgroundColor: 'var(--border-light)' }} />

          {/* Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Zoom:</span>
            <input
              type="range"
              min="100"
              max="600"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{
                width: '88px',
                accentColor: 'var(--accent-primary)',
                cursor: 'pointer'
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                width: '34px'
              }}
            >
              {zoom}%
            </span>
          </div>

          {/* Speed control when items selected */}
          {selectedCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingLeft: '14px',
                borderLeft: '1px solid var(--border-light)'
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Speed:</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2.5"
                value={(() => {
                  const firstSelected = subtitles.find((s) => selectedIds.includes(s.id));
                  return firstSelected && firstSelected.speed !== undefined ? firstSelected.speed : 1;
                })()}
                onChange={(e) => {
                  const spd = parseFloat(e.target.value);
                  if (!isNaN(spd)) {
                    selectedIds.forEach((id) => onUpdateSubtitle(id, { speed: spd }));
                  }
                }}
                style={{
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  width: '46px',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--accent-text)' }}>
                ({selectedCount} items)
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {subtitles.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                marginRight: '6px',
                backgroundColor: 'var(--bg-base)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)'
              }}
            >
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontWeight: 600 }}
                title="Detected Male voices"
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                {subtitles.filter((s) => s.gender === 'Male').length} Male
              </span>
              <span style={{ color: 'var(--border-light)' }}>•</span>
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399', fontWeight: 600 }}
                title="Detected Female voices"
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                {subtitles.filter((s) => s.gender === 'Female').length} Female
              </span>
            </div>
          )}

          {/* Transcribe Button */}
          <button
            onClick={onTranscribeClick}
            disabled={isTranscribing}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isTranscribing ? 'not-allowed' : 'pointer',
              opacity: isTranscribing ? 0.75 : 1,
              border: 'none',
              backgroundColor: isTranscribing ? '#047857' : '#059669',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {isTranscribing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isTranscribing ? 'Transcribing...' : 'Transcribe'}
          </button>

          {/* Generate Selected Audio Button */}
          <button
            onClick={onGenerateAudioClick}
            disabled={isGeneratingAudio || selectedCount === 0}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isGeneratingAudio || selectedCount === 0 ? 'not-allowed' : 'pointer',
              opacity: isGeneratingAudio || selectedCount === 0 ? 0.6 : 1,
              border: 'none',
              backgroundColor: isGeneratingAudio ? '#dc2626' : 'var(--accent-primary)',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {isGeneratingAudio ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <AudioWaveform size={14} />
            )}
            {isGeneratingAudio ? 'Generating...' : 'Generate Selected Audio'}
          </button>
        </div>
      </div>

      {/* Main Timeline Scrollable Canvas */}
      <div
        ref={containerRef}
        className="custom-scrollbar"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          backgroundColor: 'var(--bg-base)',
          position: 'relative',
          height: '140px'
        }}
      >
        <div
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          style={{
            height: '100%',
            position: 'relative',
            width: `${zoom}%`,
            minWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '2px 0',
            cursor: 'crosshair'
          }}
        >
          {/* Time Ruler */}
          <div
            style={{
              height: '20px',
              borderBottom: '1px solid var(--border-color)',
              position: 'relative',
              userSelect: 'none'
            }}
          >
            {getRulerTicks().map((sec) => {
              const leftPercent = (sec / duration) * 100;
              return (
                <div
                  key={sec}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {formatTime(sec)}
                  </span>
                  <div style={{ height: '4px', width: '1px', backgroundColor: 'var(--border-light)' }} />
                </div>
              );
            })}
          </div>

          {/* Red Playhead Line */}
          <div
            style={{
              position: 'absolute',
              left: `${(currentTime / duration) * 100}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: '#ef4444',
              zIndex: 40,
              pointerEvents: 'none',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-4px',
                width: '10px',
                height: '10px',
                backgroundColor: '#ef4444',
                transform: 'rotate(45deg)',
                borderRadius: '2px'
              }}
            />
          </div>

          {/* Track T1 (Text Subtitles) */}
          <div
            style={{
              height: '44px',
              marginTop: '4px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {/* Sticky T1 Badge */}
            <div
              style={{
                position: 'sticky',
                left: '8px',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-base)',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 30,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                pointerEvents: 'auto'
              }}
            >
              T1
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearTrack('T1');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Clear all subtitles from T1 track"
              >
                <Trash2 size={10} />
              </button>
            </div>

            {/* Subtitle Blocks on T1 */}
            {subtitles.map((item) => {
              const left = (item.start_time / duration) * 100;
              const width = Math.max(0.4, ((item.end_time - item.start_time) / duration) * 100);
              const isSelected = selectedIds.includes(item.id);
              const isMale = item.gender === 'Male';

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.ctrlKey || e.metaKey) {
                      onSelectIds((prev) =>
                        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                      );
                    } else {
                      onSelectIds([item.id]);
                    }
                    onSeekTime(item.start_time);
                  }}
                  className="font-khmer"
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    top: '4px',
                    bottom: '4px',
                    backgroundColor: isSelected
                      ? (isMale ? '#2563eb' : '#10b981')
                      : (isMale ? '#1d4ed8' : '#047857'),
                    border: isSelected
                      ? (isMale ? '1px solid #93c5fd' : '1px solid #6ee7b7')
                      : (isMale ? '1px solid #3b82f6' : '1px solid #059669'),
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '10px',
                    padding: '0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px #fff, 0 4px 6px rgba(0, 0, 0, 0.3)' : 'none',
                    zIndex: isSelected ? 20 : 10,
                    userSelect: 'none'
                  }}
                  title={`[${item.gender || 'Female'}] ${formatTime(item.start_time)} - ${formatTime(item.end_time)}: ${item.translated_text || item.text}`}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '1px 3px',
                      borderRadius: '2px',
                      backgroundColor: isMale ? 'rgba(30, 58, 138, 0.9)' : 'rgba(6, 78, 59, 0.9)',
                      color: isMale ? '#bfdbfe' : '#a7f3d0',
                      border: isMale ? '1px solid #3b82f6' : '1px solid #10b981',
                      flexShrink: 0
                    }}
                  >
                    {isMale ? 'M' : 'F'}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.translated_text || item.text}
                  </span>

                  {/* Right resize handle */}
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(item, e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'e-resize',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    }}
                    title="Drag to adjust subtitle end time"
                  />
                </div>
              );
            })}
          </div>

          {/* Track A1 (Audio Tracks) */}
          <div
            style={{
              height: '44px',
              marginTop: '4px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {/* Sticky A1 Badge */}
            <div
              style={{
                position: 'sticky',
                left: '8px',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-base)',
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 30,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                pointerEvents: 'auto'
              }}
            >
              A1
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMutedA1(!isMutedA1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isMutedA1 ? '#f87171' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={isMutedA1 ? 'Unmute A1 audio' : 'Mute A1 audio'}
              >
                {isMutedA1 ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearTrack('A1');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Clear all generated audio from A1 track"
              >
                <Trash2 size={10} />
              </button>
            </div>

            {/* Audio Blocks on A1 (Exact DAI-Dubber Speed Ratio Badges!) */}
            {subtitles
              .filter((it) => it.audio_url || it.audio_status === 'ready')
              .map((item) => {
                const aStart = item.audio_start !== undefined && item.audio_start !== null ? item.audio_start : item.start_time;
                const aDuration = item.audio_duration || (item.end_time - item.start_time);
                const left = (aStart / duration) * 100;
                const width = Math.max(0.4, (aDuration / duration) * 100);
                const isSelected = selectedIds.includes(item.id);
                const isPlayingThis = playingAudioId === item.id;

                // Calculated speed multiplier label (e.g. 1.0x, 1.4x, 2.2x)
                const speedLabel = item.speed ? `${item.speed.toFixed(1)}x` : '1.0x';

                return (
                  <div
                    key={`audio-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIds([item.id]);
                      onSeekTime(aStart);
                      if (onPlayAudioItem) {
                        onPlayAudioItem(item);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      top: '4px',
                      bottom: '4px',
                      backgroundColor: isPlayingThis ? '#059669' : isSelected ? '#6366f1' : '#4f46e5',
                      border: isPlayingThis ? '1px solid #34d399' : isSelected ? '1px solid #a5b4fc' : '1px solid #6366f1',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '10px',
                      padding: '0 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                      boxShadow: isPlayingThis
                        ? '0 0 0 2px #34d399, 0 4px 10px rgba(16, 185, 129, 0.5)'
                        : isSelected
                        ? '0 0 0 2px #fff, 0 4px 6px rgba(0, 0, 0, 0.3)'
                        : 'none',
                      zIndex: isPlayingThis ? 25 : isSelected ? 20 : 10,
                      userSelect: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Audio: ${item.gender} - Speed: ${speedLabel} - Click to preview`}
                  >
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 3px',
                        borderRadius: '2px',
                        backgroundColor: item.gender === 'Male' ? 'rgba(30, 58, 138, 0.9)' : 'rgba(79, 70, 229, 0.9)',
                        color: item.gender === 'Male' ? '#bfdbfe' : '#e0e7ff',
                        flexShrink: 0
                      }}
                    >
                      {item.gender === 'Male' ? 'M' : 'F'}
                    </span>
                    <Volume2 size={11} style={{ flexShrink: 0, opacity: 0.8 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                      {speedLabel}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
