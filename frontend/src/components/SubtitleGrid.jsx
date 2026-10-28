import React, { useState } from 'react';
import { Play, Plus, Trash2, Mic, Split, ArrowDown, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { formatTime, parseTimeToSeconds } from '../utils/time_formatter';

export default function SubtitleGrid({
  subtitles,
  currentTime,
  onSeek,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSplitItem,
  onMergeItem,
  onGenerateItemTTS,
  showTranslation
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState(null);

  const filtered = subtitles.filter(
    (s) =>
      s.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.translated_text && s.translated_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const playTTSAudio = (item) => {
    if (!item.audio_url) return;
    const audio = new Audio(item.audio_url);
    setPlayingAudioId(item.id);
    audio.play();
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search and stats bar */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search subtitles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Total: <strong style={{ color: '#fff' }}>{subtitles.length}</strong>
          </span>
          <button
            onClick={() => onAddItem(currentTime)}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <Plus size={14} /> Add Line
          </button>
        </div>
      </div>

      {/* Subtitles scrollable table/list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No subtitles yet. Upload a subtitle file (.srt, .vtt) or transcribe the video with Whisper.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((item) => {
              const isActive = currentTime >= item.start_time && currentTime <= item.end_time;
              const duration = Math.max(0.1, item.end_time - item.start_time);
              const textLen = (showTranslation && item.translated_text ? item.translated_text : item.text).length;
              const cps = (textLen / duration).toFixed(1);
              const isFast = cps > 20;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-tertiary)',
                    border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Header: Index, Times, Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: isActive ? 'var(--accent-color)' : '#26324b',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px'
                        }}
                      >
                        #{item.index}
                      </span>

                      {/* Start Time */}
                      <input
                        type="text"
                        defaultValue={formatTime(item.start_time)}
                        onBlur={(e) => {
                          const sec = parseTimeToSeconds(e.target.value);
                          onUpdateItem(item.id, { start_time: sec });
                        }}
                        style={{
                          width: '85px',
                          backgroundColor: '#0a0d14',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: '#fff',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>

                      {/* End Time */}
                      <input
                        type="text"
                        defaultValue={formatTime(item.end_time)}
                        onBlur={(e) => {
                          const sec = parseTimeToSeconds(e.target.value);
                          onUpdateItem(item.id, { end_time: sec });
                        }}
                        style={{
                          width: '85px',
                          backgroundColor: '#0a0d14',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: '#fff',
                          padding: '2px 6px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          textAlign: 'center'
                        }}
                      />

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ({duration.toFixed(2)}s)
                      </span>

                      {isFast && (
                        <span className="badge badge-warning" title="High reading speed (>20 chars/sec)">
                          Fast CPS: {cps}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Seek Button */}
                      <button
                        onClick={() => onSeek(item.start_time)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Seek video to start"
                      >
                        <Play size={12} />
                      </button>

                      {/* TTS Audio Preview / Generate */}
                      {item.audio_url ? (
                        <button
                          onClick={() => playTTSAudio(item)}
                          className="btn-secondary"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: playingAudioId === item.id ? '#34d399' : 'var(--text-main)'
                          }}
                          title={`Play Dubbing Audio (${item.audio_duration}s)`}
                        >
                          <Play size={12} /> TTS ({item.audio_duration}s)
                        </button>
                      ) : (
                        <button
                          onClick={() => onGenerateItemTTS(item)}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          title="Generate voice for this line"
                        >
                          <Mic size={12} /> Voice
                        </button>
                      )}

                      {/* Split button */}
                      <button
                        onClick={() => onSplitItem(item.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Split line into two"
                      >
                        <Split size={12} />
                      </button>

                      {/* Merge with next */}
                      <button
                        onClick={() => onMergeItem(item.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Merge with next line"
                      >
                        <ArrowDown size={12} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="btn-danger"
                        style={{ padding: '4px 8px' }}
                        title="Delete line"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Original Text */}
                  <textarea
                    rows={item.text.includes('\n') ? 2 : 1}
                    value={item.text}
                    onChange={(e) => onUpdateItem(item.id, { text: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(10, 13, 20, 0.7)',
                      border: '1px solid #2d3a54',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      padding: '6px 10px',
                      fontSize: '13px',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                    placeholder="Original subtitle text..."
                  />

                  {/* Translation Text (if shown) */}
                  {showTranslation && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <textarea
                        rows={item.translated_text && item.translated_text.includes('\n') ? 2 : 1}
                        value={item.translated_text || ''}
                        onChange={(e) => onUpdateItem(item.id, { translated_text: e.target.value })}
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(30, 27, 75, 0.4)',
                          border: '1px solid rgba(129, 140, 248, 0.3)',
                          borderRadius: '6px',
                          color: '#fef08a',
                          padding: '6px 10px',
                          fontSize: '13px',
                          resize: 'vertical',
                          outline: 'none'
                        }}
                        placeholder="Translated text (e.g. Khmer / English)..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

