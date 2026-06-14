import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type DisplayMode = 'zh' | 'en' | 'zh-en';

export function getMode(): DisplayMode {
  return (localStorage.getItem('pdc_display_mode') as DisplayMode) || 'zh';
}

function setModeStorage(m: DisplayMode) {
  localStorage.setItem('pdc_display_mode', m);
}

export function useAppTranslation(ns?: string) {
  const { t, i18n } = useTranslation(ns);
  const [mode, setModeState] = useState<DisplayMode>(getMode);

  useEffect(() => {
    const handler = () => setModeState(getMode());
    window.addEventListener('displayModeChange', handler);
    return () => window.removeEventListener('displayModeChange', handler);
  }, []);

  const tt = useCallback(
    (key: string, options?: Record<string, any>): string => {
      if (mode === 'zh-en') {
        const zh = i18n.t(key, { ...options, lng: 'zh' });
        const en = i18n.t(key, { ...options, lng: 'en' });
        return `${zh} / ${en}`;
      }
      return t(key, options);
    },
    [t, i18n, mode],
  );

  const changeMode = useCallback(
    (m: DisplayMode) => {
      setModeStorage(m);
      const lng = m === 'en' ? 'en' : 'zh';
      i18n.changeLanguage(lng);
      window.dispatchEvent(new Event('displayModeChange'));
    },
    [i18n],
  );

  return { t: tt, i18n, mode, changeMode };
}
