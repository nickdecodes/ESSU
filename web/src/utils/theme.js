import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'system');
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('themeMode');
    return stored === 'dark' || (!stored || stored === 'system') && getSystemTheme();
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => themeMode === 'system' && setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(newMode);
    setDarkMode(newMode === 'dark' || newMode === 'system' && getSystemTheme());
    localStorage.setItem('themeMode', newMode);
  };

  return React.createElement(
    ThemeContext.Provider,
    { value: { darkMode, toggleTheme, themeMode } },
    children
  );
};
