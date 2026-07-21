import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Tag, theme } from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useKBSelect } from '../contexts/KBSelectContext';
import { listKBs, type KBListItem } from '../api/kb';

const { Header, Sider, Content } = Layout;

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { setSelectedKBId } = useKBSelect();
  const { token: themeToken } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [kbs, setKBs] = useState<KBListItem[]>([]);

  useEffect(() => {
    listKBs().then(setKBs).catch(() => {});
  }, []);

  const handleMenuClick = (key: string) => {
    if (key.startsWith('/kb-')) {
      const kbId = parseInt(key.replace('/kb-', ''));
      setSelectedKBId(kbId);
      navigate(`/kb/${kbId}`);
    } else if (key.startsWith('/qa-kb-')) {
      const kbId = parseInt(key.replace('/qa-kb-', ''));
      setSelectedKBId(kbId);
      navigate(`/qa?kb_id=${kbId}`);
    } else {
      navigate(key);
    }
  };

  const menuItems = [
    { key: '/qa', icon: <MessageOutlined />, label: '问答' },
    ...(isAdmin ? [{ key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' }] : []),
    { key: 'divider-kb', type: 'divider' as const, label: '知识库' },
    ...kbs.map((kb) => ({
      key: `/qa-kb-${kb.id}`,
      icon: <BookOutlined />,
      label: kb.name,
    })),
    { key: '/search', icon: <SearchOutlined />, label: '知识库搜索' },
  ];

  if (isAdmin) {
    menuItems.push(
      { key: 'divider-admin', type: 'divider' as const, label: '管理' },
      ...kbs.map((kb) => ({
        key: `/kb-${kb.id}`,
        icon: <DatabaseOutlined />,
        label: `管理 · ${kb.name}`,
      })),
      { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
      { key: '/admin/settings', icon: <SettingOutlined />, label: '模型配置' },
    );
  }

  // Find the best matching key for current path
  const currentPath = location.pathname + location.search;
  const allKeys = menuItems.map((m) => m.key as string).filter((k) => !k.startsWith('divider'));
  const selectedKey =
    allKeys.find((k) => k === currentPath) ||
    allKeys.find((k) => currentPath.startsWith(k)) ||
    '/qa';

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: themeToken.colorBgContainer,
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          padding: '0 24px', height: 56, lineHeight: '56px', zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: themeToken.colorPrimary, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: 'monospace', flexShrink: 0,
          }}>
            Q
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            RAG 知识库问答系统
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14 }}>{user?.username}</span>
          <Tag color={isAdmin ? 'blue' : 'green'}>{isAdmin ? '管理员' : '用户'}</Tag>
          <Button icon={<LogoutOutlined />} onClick={logout}>退出</Button>
        </div>
      </Header>
      <Layout>
        <Sider
          width={220} collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null}
          style={{ background: themeToken.colorBgContainer, borderRight: `1px solid ${themeToken.colorBorderSecondary}` }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => handleMenuClick(key)}
              style={{ border: 'none', marginTop: 4, flex: 1 }}
            />
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', borderTop: `1px solid ${themeToken.colorBorderSecondary}`,
                color: themeToken.colorTextSecondary, fontSize: 16, flexShrink: 0,
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          </div>
        </Sider>
        <Content style={{ padding: 24, overflow: 'auto', background: themeToken.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
