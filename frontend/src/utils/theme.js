// MK Subtitle Studio - Visual Themes & Color Schemes

export const THEME_PRESETS = [
  {
    id: 'midnight',
    label: 'Midnight Slate',
    description: 'Modern Dark Slate & Navy',
    baseColor: '#020617',
    panelColor: '#0f172a',
    borderColor: '#1e293b',
    badge: 'Default'
  },
  {
    id: 'pure_black',
    label: 'Pure Black (OLED)',
    description: 'True Pitch Black & High Contrast',
    baseColor: '#000000',
    panelColor: '#09090b',
    borderColor: '#27272a',
    badge: 'OLED'
  },
  {
    id: 'cyber_purple',
    label: 'Cyber Neon',
    description: 'Dark Violet & Electric Atmosphere',
    baseColor: '#0a0614',
    panelColor: '#130d24',
    borderColor: '#2a1b4e',
    badge: 'Neon'
  },
  {
    id: 'warm_espresso',
    label: 'Warm Espresso',
    description: 'Dark Bronze & Warm Mocha',
    baseColor: '#120e0d',
    panelColor: '#1c1615',
    borderColor: '#332725',
    badge: 'Warm'
  },
  {
    id: 'deep_forest',
    label: 'Deep Forest',
    description: 'Dark Pine & Emerald Studio',
    baseColor: '#06120e',
    panelColor: '#0b1e17',
    borderColor: '#1a3d31',
    badge: 'Nature'
  }
];

export const ACCENT_PRESETS = [
  { id: 'red', label: 'MK Red', color: '#ef4444', text: '#f87171' },
  { id: 'violet', label: 'Electric Violet', color: '#8b5cf6', text: '#a78bfa' },
  { id: 'cyan', label: 'Ocean Cyan', color: '#06b6d4', text: '#22d3ee' },
  { id: 'amber', label: 'Amber Gold', color: '#f59e0b', text: '#fbbf24' },
  { id: 'emerald', label: 'Emerald Green', color: '#10b981', text: '#34d399' }
];

export function getStoredTheme() {
  try {
    return localStorage.getItem('mk_studio_theme') || 'midnight';
  } catch (e) {
    return 'midnight';
  }
}

export function getStoredAccent() {
  try {
    return localStorage.getItem('mk_studio_accent') || 'red';
  } catch (e) {
    return 'red';
  }
}

export function applyTheme(themeId, accentId) {
  const root = document.documentElement;
  if (!root) return;

  const validTheme = THEME_PRESETS.some((t) => t.id === themeId) ? themeId : 'midnight';
  const validAccent = ACCENT_PRESETS.some((a) => a.id === accentId) ? accentId : 'red';

  root.setAttribute('data-theme', validTheme);
  root.setAttribute('data-accent', validAccent);

  try {
    localStorage.setItem('mk_studio_theme', validTheme);
    localStorage.setItem('mk_studio_accent', validAccent);
  } catch (e) {
    // ignore quota errors
  }
}

