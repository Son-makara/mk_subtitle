import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  AudioWaveform,
  Trash2,
  Volume2,
  VolumeX,
  Loader2,
  MicOff,
  Music,
  CheckCircle2,
  Compass,
  Repeat,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { formatTime } from '../utils/time_formatter';

export default function TimelineEditor({
  subtitles,
  selectedIds,
  onSelectIds,
  currentTime,
  onSeekTime,
  totalDuration,
  isPlaying = false,
  onTranscribeClick,
  onGenerateAudioClick,
  onUpdateSubtitle,
  onClearTrack,
  onPlayAudioItem,
  playingAudioId,
  isTranscribing,
  isGeneratingAudio,
  onRemoveVocalsClick,
  isRemovingVocals,
  hasCleanBgm,
  cleanBgmFilename,
  onToggleCleanBgm,
  cleanBgmEnabled,
  bgmVolume,
  onBgmVolumeChange,
  hasVideoLoaded
}) {
  const [zoom, setZoom] = useState(100);
  const [isMutedA1, setIsMutedA1] = useState(false);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const [resizingItem, setResizingItem] = useState(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [followPlayhead, setFollowPlayhead] = useState(true);
  const [isLooping, setIsLooping] = useState(false);

  const duration = Math.max(totalDuration || 45.10, 10);

  // Time ruler ticks calculation (adaptive for short clips up to 1h+ full movies)
  const getRulerTicks = () => {
    let tickInterval = 5;
    if (duration > 3600) {
      tickInterval = zoom >= 400 ? 15 : zoom >= 200 ? 30 : 60;
    } else if (duration > 1200) {
      tickInterval = zoom >= 400 ? 5 : zoom >= 200 ? 15 : 30;
    } else if (duration > 300) {
      tickInterval = zoom >= 400 ? 2 : zoom >= 200 ? 5 : 10;
    } else {
      tickInterval = zoom >= 400 ? 1 : zoom >= 200 ? 2 : 5;
    }
    const ticks = [];
    for (let t = 0; t <= duration + tickInterval; t += tickInterval) {
      ticks.push(t);
    }
    return ticks;
  };

  // Precise calculation of target timestamp from mouse X coordinate
  const calculateTimeFromX = useCallback(
    (clientX) => {
      if (!timelineRef.current) return 0;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      return parseFloat((percentage * duration).toFixed(3));
    },
    [duration]
  );

  // MouseDown starts continuous scrubbing on timeline or playhead
  const handleTimelineMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.resize-handle')) return;
    setIsScrubbing(true);
    const targetTime = calculateTimeFromX(e.clientX);
    onSeekTime(targetTime);
  };

  // Resize start supporting both left ('left') and right ('right') trimming
  const handleResizeStart = (item, edge, e) => {
    e.stopPropagation();
    setResizingItem({
      id: item.id,
      edge: edge || 'right',
      startX: e.clientX,
      origStart: item.start_time,
      origEnd: item.end_time
    });
  };

  // Continuous scrubbing & subtitle trimming event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isScrubbing) {
        const targetTime = calculateTimeFromX(e.clientX);
        onSeekTime(targetTime);
      } else if (resizingItem && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const deltaSec = ((e.clientX - resizingItem.startX) / rect.width) * duration;
        const targetSub = subtitles.find((s) => s.id === resizingItem.id);
        if (targetSub) {
          if (resizingItem.edge === 'left') {
            const newStart = Math.min(targetSub.end_time - 0.3, Math.max(0, resizingItem.origStart + deltaSec));
            onUpdateSubtitle(resizingItem.id, { start_time: parseFloat(newStart.toFixed(2)) });
          } else {
            const newEnd = Math.max(targetSub.start_time + 0.3, resizingItem.origEnd + deltaSec);
            onUpdateSubtitle(resizingItem.id, { end_time: parseFloat(newEnd.toFixed(2)) });
          }
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
      if (resizingItem) setResizingItem(null);
    };

    if (isScrubbing || resizingItem) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isScrubbing, resizingItem, subtitles, duration, calculateTimeFromX, onSeekTime, onUpdateSubtitle]);

  // Follow Playhead Auto-Scroll
  useEffect(() => {
    if (!followPlayhead || isScrubbing || !containerRef.current || !timelineRef.current) return;
    const container = containerRef.current;
    const timeline = timelineRef.current;

    const totalWidth = timeline.clientWidth;
    const playheadPx = (currentTime / duration) * totalWidth;

    const viewportLeft = container.scrollLeft;
    const viewportWidth = container.clientWidth;
    const viewportRight = viewportLeft + viewportWidth;

    // Center smoothly when playhead is approaching viewport boundaries
    if (playheadPx > viewportRight - 110 || playheadPx < viewportLeft + 40) {
      const targetScroll = Math.max(0, playheadPx - viewportWidth * 0.35);
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentTime, followPlayhead, duration, isScrubbing]);

  // Loop Selection (🔁) Mode
  useEffect(() => {
    if (!isLooping || selectedIds.length === 0) return;
    const selectedItems = subtitles.filter((s) => selectedIds.includes(s.id));
    if (selectedItems.length === 0) return;

    const minStart = Math.min(...selectedItems.map((s) => s.start_time));
    const maxEnd = Math.max(...selectedItems.map((s) => s.end_time));

    // When playhead reaches or passes maxEnd, loop back to minStart
    if (currentTime >= maxEnd || currentTime < minStart - 0.2) {
      onSeekTime(minStart);
    }
  }, [currentTime, isLooping, selectedIds, subtitles, onSeekTime]);

  // Ctrl + Mouse Wheel Smooth Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 30 : -30;
        setZoom((prev) => Math.max(100, Math.min(800, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Frame Stepping & Quick Navigation Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.1;
        onSeekTime(Math.max(0, currentTime - step));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.1;
        onSeekTime(Math.min(duration, currentTime + step));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onSeekTime(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onSeekTime(duration);
      } else if (e.key === 'l' || e.key === 'L') {
        if (!e.ctrlKey && !e.metaKey && selectedIds.length > 0) {
          e.preventDefault();
          setIsLooping((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTime, duration, onSeekTime, selectedIds]);

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

          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Zoom:</span>
            <button
              onClick={() => setZoom((z) => Math.max(100, z - 50))}
              className="btn-secondary"
              style={{ padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
              title="Zoom Out (or Ctrl + Wheel Down)"
            >
              <ZoomOut size={12} />
            </button>
            <input
              type="range"
              min="100"
              max="800"
              step="10"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{
                width: '76px',
                accentColor: 'var(--accent-primary)',
                cursor: 'pointer'
              }}
            />
            <button
              onClick={() => setZoom((z) => Math.min(800, z + 50))}
              className="btn-secondary"
              style={{ padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
              title="Zoom In (or Ctrl + Wheel Up)"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="btn-secondary"
              style={{ padding: '2px 6px', fontSize: '10px', borderRadius: '4px' }}
              title="Fit entire timeline into view (100%)"
            >
              Fit
            </button>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                width: '32px'
              }}
            >
              {zoom}%
            </span>
          </div>

          <div style={{ height: '14px', width: '1px', backgroundColor: 'var(--border-light)' }} />

          {/* Follow Playhead Toggle */}
          <button
            onClick={() => setFollowPlayhead(!followPlayhead)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: followPlayhead ? '1px solid #3b82f6' : '1px solid var(--border-light)',
              backgroundColor: followPlayhead ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-base)',
              color: followPlayhead ? '#60a5fa' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
            title="Auto-scroll timeline to keep playhead visible during playback"
          >
            <Compass size={12} style={{ color: followPlayhead ? '#60a5fa' : 'inherit' }} />
            <span>Follow</span>
          </button>

          {/* Loop Selection Toggle */}
          {selectedCount > 0 && (
            <button
              onClick={() => setIsLooping(!isLooping)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: isLooping ? '1px solid #10b981' : '1px solid var(--border-light)',
                backgroundColor: isLooping ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-base)',
                color: isLooping ? '#34d399' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              title="Continuously loop playback of selected subtitle line (Shortcut: Press L)"
            >
              <Repeat size={12} style={{ color: isLooping ? '#34d399' : 'inherit' }} />
              <span>Loop ({selectedCount})</span>
            </button>
          )}

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

          {/* UVR Vocal Removal Button */}
          <button
            onClick={onRemoveVocalsClick}
            disabled={isRemovingVocals || !hasVideoLoaded}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRemovingVocals || !hasVideoLoaded ? 'not-allowed' : 'pointer',
              opacity: isRemovingVocals || !hasVideoLoaded ? 0.65 : 1,
              border: 'none',
              backgroundColor: isRemovingVocals ? '#4f46e5' : hasCleanBgm ? '#4338ca' : '#6366f1',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.15s ease'
            }}
            title="Erase original dialogue speech and keep clean background music & effects using UVR AI"
          >
            {isRemovingVocals ? (
              <Loader2 size={14} className="animate-spin" />
            ) : hasCleanBgm ? (
              <CheckCircle2 size={14} style={{ color: '#a5b4fc' }} />
            ) : (
              <MicOff size={14} />
            )}
            {isRemovingVocals ? 'Removing Vocals...' : hasCleanBgm ? 'Vocals Erased ✨' : 'Remove Vocals (UVR)'}
          </button>

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
          height: '188px'
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
          {/* Time Ruler (Interactive Scrubbing) */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              handleTimelineMouseDown(e);
            }}
            style={{
              height: '22px',
              borderBottom: '1px solid var(--border-color)',
              position: 'relative',
              userSelect: 'none',
              cursor: 'ew-resize',
              backgroundColor: 'rgba(0,0,0,0.12)'
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

          {/* Red Playhead Line with Smooth Drag Scrubbing & Floating Timestamp */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsScrubbing(true);
            }}
            style={{
              position: 'absolute',
              left: `${(currentTime / duration) * 100}%`,
              top: 0,
              bottom: 0,
              width: '4px',
              marginLeft: '-2px',
              backgroundColor: '#ef4444',
              zIndex: 60,
              cursor: 'ew-resize',
              pointerEvents: 'auto',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.9)'
            }}
            title="Drag playhead to scrub timeline"
          >
            {/* Playhead Diamond Handle */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-4px',
                width: '12px',
                height: '12px',
                backgroundColor: '#ef4444',
                transform: 'rotate(45deg)',
                borderRadius: '2px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                cursor: 'ew-resize'
              }}
            />

            {/* Real-time floating timestamp badge while scrubbing */}
            {isScrubbing && (
              <div
                style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                  zIndex: 70
                }}
              >
                {formatTime(currentTime)}
              </div>
            )}
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
                  {/* Left resize handle */}
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(item, 'left', e)}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'w-resize',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: '4px 0 0 4px',
                      zIndex: 10
                    }}
                    title="Drag to trim subtitle start time"
                  />

                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
                    {item.translated_text || item.text}
                  </span>

                  {/* Right resize handle */}
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(item, 'right', e)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'e-resize',
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: '0 4px 4px 0',
                      zIndex: 10
                    }}
                    title="Drag to trim subtitle end time"
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

          {/* Track B1 (Clean Instrumental / BGM Soundtrack) */}
          <div
            style={{
              height: '42px',
              marginTop: '4px',
              backgroundColor: hasCleanBgm ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-panel)',
              border: hasCleanBgm ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-color)',
              borderRadius: '6px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {/* Sticky B1 Badge */}
            <div
              style={{
                position: 'sticky',
                left: '8px',
                fontSize: '10px',
                fontWeight: 600,
                color: hasCleanBgm ? '#a5b4fc' : 'var(--text-secondary)',
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
              B1
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCleanBgm && onToggleCleanBgm();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: !cleanBgmEnabled ? '#f87171' : '#a5b4fc',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={!cleanBgmEnabled ? 'Unmute BGM track' : 'Mute BGM track'}
              >
                {!cleanBgmEnabled ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>

              {hasCleanBgm && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={bgmVolume !== undefined ? bgmVolume : 0.4}
                    onChange={(e) => onBgmVolumeChange && onBgmVolumeChange(parseFloat(e.target.value))}
                    style={{ width: '40px', accentColor: '#6366f1', cursor: 'pointer', height: '3px' }}
                    title={`BGM Volume: ${Math.round((bgmVolume || 0.4) * 100)}%`}
                  />
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#818cf8', width: '22px' }}>
                    {Math.round((bgmVolume || 0.4) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* B1 Track Waveform Bar */}
            {hasCleanBgm ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '28px',
                  margin: '0 4px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '145px',
                  gap: '8px',
                  overflow: 'hidden'
                }}
              >
                <Music size={13} style={{ color: '#a5b4fc', flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#c7d2fe',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  🎵 Clean Movie Soundtrack (Dialogue Erased by UVR AI) • BGM & Sound Effects
                </span>
              </div>
            ) : (
              <div
                style={{
                  paddingLeft: '56px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic'
                }}
              >
                Click "Remove Vocals (UVR)" above to isolate clean background music & SFX.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
