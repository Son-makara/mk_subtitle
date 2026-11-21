import React, { useState, useEffect } from 'react';
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
  Moon,
  Key,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Clipboard,
  Database,
  Globe
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
  const [activeTab, setActiveTab] = useState('theme'); // 'theme', 'ai', 'audio', 'system'

  // AI & Google Gemini Key States
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('mk_gemini_api_key') || '');
  const [showKeyText, setShowKeyText] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // { type: 'success' | 'error' | 'info', message: '' }
  const [browserCacheFreed, setBrowserCacheFreed] = useState(false);

  // Sync status on open
  useEffect(() => {
    if (isOpen) {
      fetchGeminiStatus();
      setVerifyStatus(null);
    }
  }, [isOpen]);

  const fetchGeminiStatus = async () => {
    try {
      const res = await fetch('/api/settings/gemini-key');
      if (res.ok) {
        const data = await res.json();
        setIsGeminiConnected(!!data.is_connected);
        if (data.masked_key) {
          setMaskedKey(data.masked_key);
        }
      }
    } catch (e) {
      // Offline or backend not reachable yet
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setGeminiKeyInput(text.trim());
        setVerifyStatus(null);
      }
    } catch (err) {
      // Clipboard permission denied or unavailable
    }
  };

  const handleSaveGeminiKey = async () => {
    const trimmed = geminiKeyInput.trim();
    if (!trimmed) {
      setVerifyStatus({ type: 'error', message: 'Please paste or enter a valid Google Gemini API key.' });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/settings/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: trimmed })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Google API verification failed');
      }

      // Persist in client localStorage cache
      localStorage.setItem('mk_gemini_api_key', trimmed);
      setIsGeminiConnected(true);
      setMaskedKey(data.masked_key || (trimmed.slice(0, 6) + '...' + trimmed.slice(-4)));
      setGeminiKeyInput('');
      setVerifyStatus({
        type: 'success',
        message: data.message || 'Google Gemini API key verified and stored safely in local cache!'
      });
    } catch (err) {
      setVerifyStatus({
        type: 'error',
        message: err.message || 'Failed to verify API key with Google AI.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnectGemini = async () => {
    if (!window.confirm('Are you sure you want to remove your Google Gemini API key from local storage?')) {
      return;
    }

    try {
      await fetch('/api/settings/gemini-key', { method: 'DELETE' });
    } catch (e) {
      // Backend error ignored
    }

    localStorage.removeItem('mk_gemini_api_key');
    setIsGeminiConnected(false);
    setMaskedKey('');
    setGeminiKeyInput('');
    setVerifyStatus({ type: 'info', message: 'Gemini API key disconnected and purged from cache.' });
  };

  const handleClearBrowserCache = () => {
    try {
      localStorage.removeItem('mk_thumbnail_studio_state');
      localStorage.removeItem('mk_subtitle_draft');
      setBrowserCacheFreed(true);
      setTimeout(() => setBrowserCacheFreed(false), 3000);
    } catch (e) { }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '640px',
          width: '95vw',
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
                Studio Settings & Configuration
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Manage Google AI API key, cache storage, audio voices, and themes
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
            gap: '6px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '8px',
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'theme', label: 'Theme & Style', icon: Palette },
            { id: 'ai', label: 'AI & Google Account', icon: Key },
            { id: 'audio', label: 'Voice & AI Dubbing', icon: Volume2 },
            { id: 'system', label: 'Engine & Storage Cache', icon: Cpu }
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
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={14} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                <span>{tab.label}</span>
                {tab.id === 'ai' && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isGeminiConnected ? '#10b981' : '#64748b'
                    }}
                    title={isGeminiConnected ? 'Gemini Connected' : 'No API Key'}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Tab Contents */}

        {/* --- TAB: THEME --- */}
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
                      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'space-between', justifyContent: 'space-between', marginBottom: '6px' }}>
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

        {/* --- TAB: AI & GOOGLE ACCOUNT --- */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: isGeminiConnected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)',
                border: isGeminiConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} style={{ color: isGeminiConnected ? '#10b981' : 'var(--text-muted)' }} />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-bright)' }}>
                      Google Gemini AI Engine
                    </span>
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: isGeminiConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                        color: isGeminiConnected ? '#34d399' : 'var(--text-muted)'
                      }}
                    >
                      {isGeminiConnected ? '🟢 Connected & Cached' : '⚪ Not Connected'}
                    </span>
                  </div>
                </div>

                {isGeminiConnected && (
                  <button
                    onClick={handleDisconnectGemini}
                    className="btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: '#f87171',
                      borderColor: 'rgba(248, 113, 113, 0.3)'
                    }}
                    title="Disconnect and remove key from cache"
                  >
                    Disconnect Key
                  </button>
                )}
              </div>

              {isGeminiConnected ? (
                <div style={{ fontSize: '11px', color: '#a7f3d0' }}>
                  Active Key: <code style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: '4px', color: '#6ee7b7' }}>{maskedKey}</code>
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                    (Stored in local storage cache & backend settings)
                  </span>
                </div>
              ) : (
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Connect your free Google Account Gemini API Key to enable high-quality Khmer Poster OCR translation, AI image generation, viral title recommendations, and deep context subtitle translations.
                </p>
              )}
            </div>

            {/* Quick Link to Google AI Studio */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={14} /> Get Free API Key with Google Account
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Free tier: 15 RPM (free forever with any Gmail account). No credit card required.
                </div>
              </div>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>Google AI Studio</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Key Input & Actions */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                {isGeminiConnected ? 'Update / Replace API Key:' : 'Enter Google Gemini API Key:'}
              </label>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    value={geminiKeyInput}
                    onChange={(e) => {
                      setGeminiKeyInput(e.target.value);
                      if (verifyStatus) setVerifyStatus(null);
                    }}
                    placeholder={isGeminiConnected ? 'Paste new AIzaSy... key to update' : 'AIzaSy... (Paste your key here)'}
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-hover)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-bright)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText(!showKeyText)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title={showKeyText ? 'Hide Key' : 'Show Key'}
                  >
                    {showKeyText ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Paste from clipboard"
                >
                  <Clipboard size={13} />
                  <span>Paste</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveGeminiKey}
                  disabled={isVerifying || !geminiKeyInput.trim()}
                  className="btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    opacity: (isVerifying || !geminiKeyInput.trim()) ? 0.6 : 1,
                    cursor: (isVerifying || !geminiKeyInput.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Verify & Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Verification Status Notification */}
            {verifyStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor:
                    verifyStatus.type === 'success'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : verifyStatus.type === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(56, 189, 248, 0.15)',
                  border:
                    verifyStatus.type === 'success'
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : verifyStatus.type === 'error'
                      ? '1px solid rgba(239, 68, 68, 0.35)'
                      : '1px solid rgba(56, 189, 248, 0.35)',
                  color:
                    verifyStatus.type === 'success'
                      ? '#34d399'
                      : verifyStatus.type === 'error'
                      ? '#f87171'
                      : '#38bdf8'
                }}
              >
                {verifyStatus.type === 'success' ? (
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                ) : (
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                )}
                <div style={{ flex: 1, lineHeight: 1.4 }}>
                  {verifyStatus.message}
                </div>
              </div>
            )}

            {/* Persistent Cache Info Callout */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <Database size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Stored in Local Cache: </strong>
                Your API key is saved on your computer in <code style={{ color: '#cbd5e1' }}>backend/storage/settings.json</code> and browser cache. It is automatically loaded whenever you open Thumbnail Studio or Subtitle Studio.
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: AUDIO --- */}
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

        {/* --- TAB: SYSTEM & STORAGE CACHE --- */}
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

            {/* Storage Cache Management */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Temporary Storage Cache:
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <HardDrive size={16} style={{ color: '#38bdf8' }} />
                  <div>
                    <div>Backend Temp Cache: <strong style={{ color: '#fff' }}>{storageUsage?.total_mb || 0} MB</strong></div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Audio stems, temporary exports, and generated assets</div>
                  </div>
                </div>
                {onPurgeStorage && (
                  <button
                    onClick={() => onPurgeStorage(false)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Trash2 size={12} /> Clear Disk Cache
                  </button>
                )}
              </div>
            </div>

            {/* Browser Local Storage Cache */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Browser & UI Draft Cache:
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Database size={16} style={{ color: '#a78bfa' }} />
                  <div>
                    <div>Local Workspace Cache: <strong style={{ color: '#fff' }}>Active</strong></div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {browserCacheFreed ? '✓ Temporary studio drafts cleared!' : 'Stores canvas draft, recent prompts, and undo history'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleClearBrowserCache}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <RefreshCw size={12} /> Clear Draft Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: '7px 22px', borderRadius: '6px', fontWeight: 600 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
