import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/projects', icon: <FolderOutlined />, label: '项目管理' },
  { key: '/admin/filters', icon: <FilterOutlined />, label: '滤波器库' },
  { key: '/admin/cables', icon: <ThunderboltOutlined />, label: '电缆规格' },
  { key: '/admin/gb-tables', icon: <SafetyOutlined />, label: 'GB标准数据' },
  { key: '/admin/prices', icon: <DollarOutlined />, label: '价格管理' },
  { key: '/admin/selection-rules', icon: <SafetyOutlined />, label: '选型规则' },
  { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey = '/' + location.pathname.split('/').slice(1, 2).join('/');

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ height: 48, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: collapsed ? 14 : 16 }}>
          {collapsed ? 'PDC' : '暗室配电计算'}
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
          <span>
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => setCollapsed(false)} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => setCollapsed(true)} />
            )}
          </span>
          <Dropdown menu={{
            items: userMenuItems,
            onClick: ({ key }) => {
              if (key === 'logout') {
                logout();
                navigate('/login');
              }
            },
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
    </Layout>
  );
}
