import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Cpu,
  X,
  Check,
  Sparkles,
  Volume2,
  HardDrive,
  Trash2,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { THEME_PRESETS, ACCENT_PRESETS } from '../utils/theme';

export default function SettingsModal({
  isOpen,
  onClose,
  currentTheme = 'midnight',
  onSelectTheme,
  currentAccent = 'red',
  onSelectAccent,
  storageUsage = { total_mb: 0 },
  onPurgeStorage
}) {
  const [activeTab, setActiveTab] = useState('theme'); // 'theme', 'audio', 'system'

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '620px',
          padding: '20px 24px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-panel)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* 1. Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-bright)', margin: 0 }}>
                Studio Settings & Themes
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Customize visual background, theme colors, and AI studio defaults
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px 8px', borderRadius: '6px' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* 2. Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '8px'
          }}
        >
          {[
            { id: 'theme', label: 'Theme & Background', icon: Palette },
            { id: 'audio', label: 'Voice & AI Dubbing', icon: Volume2 },
            { id: 'system', label: 'Engine & Storage', icon: Cpu }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  backgroundColor: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Tab Contents */}
        {activeTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Theme Presets Grid */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                Studio Background Style:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {THEME_PRESETS.map((theme) => {
                  const isSelected = currentTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => onSelectTheme(theme.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: theme.panelColor,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxShadow: isSelected ? '0 0 0 1px var(--accent-primary)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                          {theme.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              color: '#cbd5e1'
                            }}
                          >
                            {theme.badge}
                          </span>
                          {isSelected && (
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff'
                              }}
                            >
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px 0' }}>
                        {theme.description}
                      </p>

                      {/* Swatch palette bars */}
                      <div style={{ display: 'flex', gap: '4px', height: '14px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ flex: 1, backgroundColor: theme.baseColor }} title="Base Background" />
                        <div style={{ flex: 1, backgroundColor: theme.panelColor }} title="Panel Background" />
                        <div style={{ flex: 1, backgroundColor: theme.borderColor }} title="Border Color" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Chooser */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                Accent & Highlight Color:
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {ACCENT_PRESETS.map((accent) => {
                  const isSelected = currentAccent === accent.id;
                  return (
                    <button
                      key={accent.id}
                      onClick={() => onSelectAccent(accent.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${accent.color}` : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-hover)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: accent.color,
                          display: 'inline-block',
                          boxShadow: isSelected ? `0 0 8px ${accent.color}` : 'none'
                        }}
                      />
                      <span>{accent.label}</span>
                      {isSelected && <Check size={12} style={{ color: accent.color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Information Banner */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span>
                Theme choices are automatically saved locally and remembered every time you open MK Subtitle Studio.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Default Male Neural Voice:
              </label>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--text-bright)'
                }}
              >
                km-KH-PisethNeural (Khmer - Natural Male)
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Default Female Neural Voice:
              </label>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--text-bright)'
                }}
              >
                km-KH-SreymomNeural (Khmer - Natural Female)
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(5, 150, 105, 0.12)',
                border: '1px solid rgba(5, 150, 105, 0.3)',
                fontSize: '11px',
                color: '#6ee7b7'
              }}
            >
              ✓ Pitch-based automatic gender assignment is enabled. Whisper STT detects whether speaker is Male or Female and assigns voices accordingly.
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Hardware Acceleration:
              </label>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={14} /> AMD AMF Hardware Acceleration (h264_amf) with seamless CPU fallback
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Temporary Storage Cache:
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <HardDrive size={15} style={{ color: '#38bdf8' }} />
                  <span>Current Cache Usage: <strong style={{ color: '#fff' }}>{storageUsage.total_mb || 0} MB</strong></span>
                </div>
                {onPurgeStorage && (
                  <button
                    onClick={() => onPurgeStorage(false)}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', color: '#f87171' }}
                  >
                    <Trash2 size={12} /> Clear Cache
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: '7px 20px', borderRadius: '6px', fontWeight: 600 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

