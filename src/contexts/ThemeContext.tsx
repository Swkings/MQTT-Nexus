import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { ThemeConfig, getThemeClasses } from '../lib/theme';
import { cn } from '../lib/utils';

interface ThemeContextValue {
  theme: ThemeConfig;
  themeClasses: ReturnType<typeof getThemeClasses>;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  theme: ThemeConfig;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
}

export function ThemeProvider({ children, theme, setTheme }: ThemeProviderProps) {
  const themeClasses = useMemo(() => getThemeClasses(theme.mode, theme.overlay), [theme]);

  // Apply theme classes to the document root so global CSS (e.g. backdrop filters / text shadows)
  // can adapt automatically based on current theme.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', theme.mode === 'dark');
    root.classList.toggle('theme-light', theme.mode === 'light');
    root.classList.toggle('theme-transparent', theme.overlay === 'transparent');
  }, [theme]);

  const contextValue: ThemeContextValue = useMemo(() => ({
    theme,
    themeClasses,
    setTheme,
  }), [theme, themeClasses, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * HOC to apply theme classes to components
 */
export function withTheme<P extends object>(
  Component: React.ComponentType<P>,
  defaultClasses?: {
    bg?: string;
    border?: string;
    text?: string;
  }
) {
  return function ThemedComponent(props: P) {
    const { theme, themeClasses } = useTheme();
    
    const classes = {
      bg: defaultClasses?.bg || themeClasses.cardBg,
      border: defaultClasses?.border || themeClasses.border,
      text: defaultClasses?.text || themeClasses.text,
    };

    return <Component {...props} theme={theme} themeClasses={themeClasses} classes={classes} />;
  };
}
