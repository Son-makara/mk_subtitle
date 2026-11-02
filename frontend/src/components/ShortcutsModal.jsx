import React from 'react';
import { X, Keyboard, Play, Flame, Globe, Mic, Plus, Trash2, ArrowLeft, ArrowRight, Settings, Film } from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: '🎬 Video Playback & Navigation',
      shortcuts: [
        { keys: ['Space'], desc: 'Play / Pause video' },
        { keys: ['←', '→'], desc: 'Step 0.1s (hold Shift for 1.0s)' },
        { keys: ['Ctrl', 'Space'], desc: 'Play audio of selected subtitle line' },
        { keys: ['P'], desc: 'Preview Khmer AI Voice for selected line' },
        { keys: ['Home', 'End'], desc: 'Jump to beginning / end of video' },
        { keys: ['L'], desc: 'Toggle A-B loop playback on selected item' }
      ]
    },
    {
      title: '⚡ Quick Render & AI Dubbing',
      shortcuts: [
        { keys: ['Ctrl', 'R'], desc: '1-Click Render current video with AMF GPU', highlight: true },
        { keys: ['Ctrl', 'Shift', 'R'], desc: 'Batch Render all selected videos to folder', highlight: true },
        { keys: ['Ctrl', 'G'], desc: 'Generate Khmer AI voice (Edge-TTS) for selected' },
        { keys: ['Ctrl', 'T'], desc: 'Translate selected subtitles to Khmer' },
        { keys: ['Ctrl', 'E'], desc: 'Open Export / Render Modal' }
      ]
    },
    {
      title: '📝 Subtitle Editing & Alignment',
      shortcuts: [
        { keys: ['Ctrl', 'Enter'], desc: 'Add new subtitle line at current playhead' },
        { keys: ['['], desc: 'Set subtitle start time to current playhead' },
        { keys: [']'], desc: 'Set subtitle end time to current playhead' },
        { keys: ['Delete'], desc: 'Delete selected subtitle line(s)' }
      ]
    },
    {
      title: '📺 Video Queue & Studio Controls',
      shortcuts: [
        { keys: ['Alt', '↑'], desc: 'Previous video in queue (or PageUp)' },
        { keys: ['Alt', '↓'], desc: 'Next video in queue (or PageDown)' },
        { keys: ['Ctrl', ','], desc: 'Open Studio Settings & Theme modal' },
        { keys: ['?'], desc: 'Show this Keyboard Shortcuts cheat sheet' }
      ]
    }
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '720px',
          width: '92%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <Keyboard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Keyboard Shortcuts (គ្រាប់ចុចកាត់)
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Control playback, editing, dubbing, and rendering 5x faster
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Grid */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}
        >
          {shortcutSections.map((sec, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  paddingBottom: '6px',
                  borderBottom: '1px solid var(--border-light)'
                }}
              >
                {sec.title}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sec.shortcuts.map((sc, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      backgroundColor: sc.highlight ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      border: sc.highlight ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <span style={{ color: sc.highlight ? '#fca5a5' : 'var(--text-secondary)', marginRight: '8px' }}>
                      {sc.desc}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: sc.highlight ? '#f87171' : 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '0 0 14px 14px'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            💡 Tip: Press <kbd style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>?</kbd> anytime to open this guide.
          </div>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '6px 18px', fontSize: '12px', fontWeight: 600 }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

