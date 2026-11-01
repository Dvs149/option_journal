import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tj_theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-kite');

    const applyTheme = (currentTheme) => {
      if (currentTheme === 'kite') {
        root.classList.add('dark', 'theme-kite');
        localStorage.setItem('tj_last_dark_theme', 'kite');
      } else if (currentTheme === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('tj_last_dark_theme', 'dark');
      } else if (currentTheme === 'light') {
        root.classList.add('light');
      } else if (currentTheme === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.add('light');
        }
      }
    };

    applyTheme(theme);
    localStorage.setItem('tj_theme', theme);

    // Listen for OS theme changes if on system
    if (theme === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') {
        const lastDark = localStorage.getItem('tj_last_dark_theme') || 'dark';
        return lastDark === 'kite' ? 'kite' : 'dark';
      } else {
        localStorage.setItem('tj_last_dark_theme', prev);
        return 'light';
      }
    });
  };

  const isDark =
    theme === 'dark' ||
    theme === 'kite' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);

  const isKite = theme === 'kite';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, isKite }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

