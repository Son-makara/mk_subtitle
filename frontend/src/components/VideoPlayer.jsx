import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Upload, Film } from 'lucide-react';
import { formatTime } from '../utils/time_formatter';

export default function VideoPlayer({
  videoUrl,
  subtitles,
  currentTime,
  onTimeUpdate,
  onVideoUpload,
  showTranslation
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState(null);

  // Sync external seek time
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.4) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Find active subtitle
  useEffect(() => {
    if (!subtitles || subtitles.length === 0) {
      setActiveSubtitle(null);
      return;
    }
    const current = subtitles.find(
      (s) => currentTime >= s.start_time && currentTime <= s.end_time
    );
    setActiveSubtitle(current || null);
  }, [currentTime, subtitles]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      onTimeUpdate(val);
    }
  };

  const stepTime = (offset) => {
    if (videoRef.current) {
      const nextTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + offset));
      videoRef.current.currentTime = nextTime;
      onTimeUpdate(nextTime);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Video Preview Box */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#000',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
            />

            {/* Subtitle Overlay Overlay */}
            {activeSubtitle && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '36px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  padding: '6px 16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '8px',
                  maxWidth: '85%',
                  pointerEvents: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {/* Translated text in yellow */}
                {showTranslation && activeSubtitle.translated_text ? (
                  <>
                    <div style={{ color: '#facc15', fontSize: '18px', fontWeight: 600, lineHeight: 1.3 }}>
                      {activeSubtitle.translated_text}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '2px', opacity: 0.8 }}>
                      {activeSubtitle.text}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#fff', fontSize: '18px', fontWeight: 500, lineHeight: 1.3 }}>
                    {activeSubtitle.text}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              cursor: 'pointer',
              padding: '40px',
              border: '2px dashed var(--border-color)',
              borderRadius: '16px',
              backgroundColor: 'rgba(17, 23, 38, 0.6)',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onVideoUpload(e.target.files[0]);
                }
              }}
            />
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)'
              }}
            >
              <Film size={32} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Click to Load Video</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports MP4, MKV, WebM, MOV
              </div>
            </div>
          </label>
        )}
      </div>

      {/* Control Bar */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Progress Slider */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            accentColor: 'var(--accent-color)',
            cursor: 'pointer',
            height: '4px'
          }}
        />

        {/* Buttons and timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={togglePlay}
              className="btn-primary"
              style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              onClick={() => stepTime(-1)}
              className="btn-secondary"
              style={{ padding: '6px 10px' }}
              title="Step backward 1s"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => stepTime(1)}
              className="btn-secondary"
              style={{ padding: '6px 10px' }}
              title="Step forward 1s"
            >
              <RotateCw size={14} />
            </button>

            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)', marginLeft: '8px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{formatTime(currentTime)}</span> / {formatTime(duration)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="btn-secondary"
              style={{ padding: '6px 10px' }}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <label className="btn-secondary" style={{ padding: '6px 12px', cursor: 'pointer' }}>
              <input
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onVideoUpload(e.target.files[0]);
                  }
                }}
              />
              <Upload size={14} /> Change Video
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

