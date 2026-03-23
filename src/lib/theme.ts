/**
 * Theme types and utilities for MQTT Nexus
 */

export type ThemeMode = 'dark' | 'light';
export type ThemeOverlay = 'opaque' | 'transparent';

export interface ThemeConfig {
  mode: ThemeMode;
  overlay: ThemeOverlay;
}

/**
 * Theme color schemes
 */
export const THEME_COLORS = {
  dark: {
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800',
    text: 'text-slate-300',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    border: 'border-slate-700',
    accent: 'cyan',
  },
  light: {
    bg: 'bg-slate-50',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-slate-100',
    text: 'text-slate-800',  // 加深文字颜色
    textPrimary: 'text-slate-950',  // 标题更深
    textSecondary: 'text-slate-600',  // 次要文字加深
    border: 'border-slate-300',
    accent: 'cyan',
  },
} as const;

/**
 * Get theme class based on theme mode and overlay state
 */
export function getThemeClasses(mode: ThemeMode, overlay: ThemeOverlay) {
  const colors = THEME_COLORS[mode];
  
  return {
    // Background classes
    mainBg: overlay === 'transparent' ? 'bg-transparent' : colors.bg,
    // 透明模式下使用更低的透明度，真正透视背景
    panelBg: overlay === 'transparent' 
      ? (mode === 'dark' ? 'bg-slate-900/20' : 'bg-white/40') 
      : colors.bgSecondary,
    cardBg: overlay === 'transparent' 
      ? (mode === 'dark' ? 'bg-slate-800/30' : 'bg-white/50') 
      : colors.bgTertiary,
    bgSecondary: colors.bgSecondary,
    bgTertiary: colors.bgTertiary,
    
    // Text classes
    text: colors.text,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    
    // Border classes
    border: overlay === 'transparent' 
      ? (mode === 'dark' ? 'border-slate-600/30' : 'border-slate-400/50') 
      : colors.border,
    
    // Effect classes
    backdropBlur: overlay === 'transparent' ? 'backdrop-blur-2xl' : '',
    shadow: overlay === 'transparent' ? 'shadow-2xl shadow-black/50' : 'shadow-lg',
    
    // Gradient for logo
    logoGradient: overlay === 'transparent'
      ? 'from-cyan-500/80 to-purple-600/80'
      : 'from-cyan-500 to-purple-600',
    
    // Overlay opacity for background effects
    bgEffectOpacity: overlay === 'transparent' ? 'opacity-20' : 'opacity-100',
    
    // Text shadow for readability on transparent backgrounds
    textShadow: overlay === 'transparent'
      ? (mode === 'dark' ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : 'drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]')
      : '',
  };
}

/**
 * Load theme from localStorage
 */
export function loadTheme(): ThemeConfig {
  if (typeof window === 'undefined') {
    return { mode: 'dark', overlay: 'opaque' };
  }
  
  try {
    const saved = localStorage.getItem('mqtt_nexus_theme');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
  }
  
  // Default theme
  return { mode: 'dark', overlay: 'opaque' };
}

/**
 * Save theme to localStorage
 */
export function saveTheme(theme: ThemeConfig) {
  try {
    localStorage.setItem('mqtt_nexus_theme', JSON.stringify(theme));
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}
