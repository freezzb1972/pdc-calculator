import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type DisplayMode = 'zh' | 'en' | 'zh-en';

function getMode(): DisplayMode {
  return (localStorage.getItem('pdc_display_mode') as DisplayMode) || 'zh';
}

interface BilingualTextProps {
  textKey: string;
  ns?: string;
  options?: Record<string, any>;
}

export default function BilingualText({ textKey, ns, options }: BilingualTextProps) {
  const { t, i18n } = useTranslation(ns);
  const [mode, setMode] = useState<DisplayMode>(getMode);

  useEffect(() => {
    const handler = () => setMode(getMode());
    window.addEventListener('displayModeChange', handler);
    return () => window.removeEventListener('displayModeChange', handler);
  }, []);

  if (mode !== 'zh-en') {
    return <>{t(textKey, options)}</>;
  }

  return (
    <span>
      {i18n.t(textKey, { ...options, lng: 'zh' })}
      <br />
      <small style={{ color: '#999', fontWeight: 300 }}>
        {i18n.t(textKey, { ...options, lng: 'en' })}
      </small>
    </span>
  );
}
