import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space, Button, Modal, Form, Input, message } from 'antd';
import {
  FolderOutlined,
  FilterOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  DollarOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useAppTranslation } from '../i18n/useAppTranslation';
import BilingualText from '../i18n/BilingualText';
import type { DisplayMode } from '../i18n/useAppTranslation';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { t, mode, changeMode } = useAppTranslation('layout');
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm] = Form.useForm();

  const menuItems = [
    { key: '/projects', icon: <FolderOutlined />, label: <BilingualText textKey="menu.projects" ns="layout" /> },
    { key: '/admin/filters', icon: <FilterOutlined />, label: <BilingualText textKey="menu.filters" ns="layout" /> },
    { key: '/admin/cables', icon: <ThunderboltOutlined />, label: <BilingualText textKey="menu.cables" ns="layout" /> },
    { key: '/admin/gb-tables', icon: <SafetyOutlined />, label: <BilingualText textKey="menu.gbTables" ns="layout" /> },
    { key: '/admin/prices', icon: <DollarOutlined />, label: <BilingualText textKey="menu.prices" ns="layout" /> },
    { key: '/admin/selection-rules', icon: <SafetyOutlined />, label: <BilingualText textKey="menu.selectionRules" ns="layout" /> },
    { key: '/admin/users', icon: <TeamOutlined />, label: <BilingualText textKey="menu.users" ns="layout" /> },
  ];

  const selectedKey = '/' + location.pathname.split('/').slice(1, 2).join('/');

  const langItems: { key: DisplayMode; label: string }[] = [
    { key: 'zh', label: t('lang.zh') },
    { key: 'en', label: t('lang.en') },
    { key: 'zh-en', label: t('lang.zhEn') },
  ];

  const userMenuItems = [
    { key: 'changePassword', icon: <LockOutlined />, label: t('userMenu.changePassword') },
    { key: 'logout', icon: <LogoutOutlined />, label: t('userMenu.logout') },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'changePassword') {
      pwForm.resetFields();
      setPwModalOpen(true);
    }
  };

  const handleChangePassword = async () => {
    const values = await pwForm.validateFields();
    setPwLoading(true);
    try {
      await api.changeMyPassword(values.old_password, values.new_password);
      message.success(t('userMenu.passwordChanged'));
      setPwModalOpen(false);
    } catch (err: any) {
      message.error(err.message || t('userMenu.passwordChangeFailed'));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ height: 48, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? t('appTitleShort') : t('appTitle')}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => setCollapsed(false)} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => setCollapsed(true)} />
            )}
            <Dropdown menu={{
              items: langItems,
              selectedKeys: [mode],
              onClick: ({ key }) => changeMode(key as DisplayMode),
            }}>
              <Button type="text" icon={<GlobalOutlined />} size="small">
                {mode === 'zh' ? '中文' : mode === 'en' ? 'EN' : '中/EN'}
              </Button>
            </Dropdown>
          </span>
          <Dropdown menu={{
            items: userMenuItems,
            onClick: handleUserMenuClick,
          }}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.display_name || user?.username}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title={t('userMenu.changePassword')}
        open={pwModalOpen}
        onOk={handleChangePassword}
        onCancel={() => setPwModalOpen(false)}
        confirmLoading={pwLoading}
      >
        <Form form={pwForm} layout="vertical">
          <Form.Item
            name="old_password"
            label={t('userMenu.oldPassword')}
            rules={[{ required: true, message: t('userMenu.oldPasswordRequired') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="new_password"
            label={t('userMenu.newPassword')}
            rules={[
              { required: true, message: t('userMenu.newPasswordRequired') },
              { min: 6, message: t('userMenu.passwordMinLength') },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label={t('userMenu.confirmPassword')}
            dependencies={['new_password']}
            rules={[
              { required: true, message: t('userMenu.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('userMenu.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
