import { useState, useEffect, useCallback } from 'react';

type FontSize = 'small' | 'medium' | 'large' | 'extraLarge';

const STORAGE_KEY = 'hafiz-font-size';

const fontSizeMap: Record<FontSize, string> = {
  small: '16px',
  medium: '18px',
  large: '22px',
  extraLarge: '26px',
};

export const useFontSize = () => {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as FontSize) || 'medium';
    } catch { return 'medium'; }
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--quran-font-size', fontSizeMap[fontSize]);
    localStorage.setItem(STORAGE_KEY, fontSize);
  }, [fontSize]);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
  }, []);

  return { fontSize, setFontSize, fontSizeClass: fontSizeMap[fontSize] };
};
