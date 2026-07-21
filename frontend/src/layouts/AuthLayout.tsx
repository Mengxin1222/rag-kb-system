import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Tag, theme } from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const userMenuItems = [
  { key: '/qa', icon: <MessageOutlined />, label: '问答' },
  { key: '/search', icon: <SearchOutlined />, label: '知识库搜索' },
];

const adminMenuItems = [
  { key: '/qa', icon: <MessageOutlined />, label: '问答' },
  { key: '/search', icon: <SearchOutlined />, label: '知识库搜索' },
  { key: '/kb/manage', icon: <DatabaseOutlined />, label: '知识库管理' },
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
];

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin } = useAuth();
  const { token: themeToken } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  const selectedKey = menuItems.find((item) => location.pathname.startsWith(item.key))?.key || '/qa';

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: themeToken.colorBgContainer,
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          padding: '0 24px',
          height: 56,
          lineHeight: '56px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: themeToken.colorPrimary,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            Q
          </div>
          {!collapsed && (
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
              RAG 知识库问答系统
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Tag color={isAdmin ? 'blue' : 'green'}>{isAdmin ? '管理员' : '用户'}</Tag>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            退出
          </Button>
        </div>
      </Header>
      <Layout>
        <Sider
          width={220}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          style={{
            background: themeToken.colorBgContainer,
            borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
              color: themeToken.colorTextSecondary,
              fontSize: 16,
              transition: 'color 150ms',
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', marginTop: 4 }}
          />
        </Sider>
        <Content
          style={{
            padding: 24,
            overflow: 'auto',
            background: themeToken.colorBgLayout,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
