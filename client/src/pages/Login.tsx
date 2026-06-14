import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useAppTranslation } from '../i18n/useAppTranslation';

export default function Login() {
  const { t } = useAppTranslation('login');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from || '/projects';

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success(t('loginSuccess'));
      navigate(from, { replace: true });
    } catch (err: any) {
      message.error(err.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{t('title')}</h2>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item name="username" rules={[{ required: true, message: t('usernameRequired') }]}>
            <Input prefix={<UserOutlined />} placeholder={t('usernamePlaceholder')} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('passwordRequired') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('passwordPlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {t('login')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
