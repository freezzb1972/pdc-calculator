import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';

const antdLocales: Record<string, any> = { zh: zhCN, en: enUS };

export default function AntdLocaleProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const locale = antdLocales[i18n.language] || zhCN;
  return (
    <ConfigProvider locale={locale} theme={{ token: { colorPrimary: '#1677ff' } }}>
      {children}
    </ConfigProvider>
  );
}
