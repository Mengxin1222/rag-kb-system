import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, Input, Button, Checkbox, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { loginAPI } from '../api/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/qa" replace />;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      message.error('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const data = await loginAPI(username.trim(), password);
      login({ username: username.trim(), role: data.role as 'admin' | 'user' }, data.access_token, remember);
      message.success('登录成功');
      navigate('/qa', { replace: true });
    } catch {
      message.error('用户名或密码错误');
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
        background: 'linear-gradient(135deg, #2f6feb 0%, #1a3d7c 100%)',
      }}
    >
      <Card
        style={{
          width: 420,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        styles={{ body: { padding: '48px 40px 40px' } }}
      >
        <Space direction="vertical" size={0} style={{ width: '100%', textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: '#2f6feb',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'monospace',
              marginBottom: 16,
            }}
          >
            Q
          </div>
          <Title level={3} style={{ marginBottom: 6 }}>
            RAG 知识库问答系统
          </Title>
          <Text type="secondary">基于检索增强生成的智能知识管理平台</Text>
        </Space>

        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Input
            size="large"
            placeholder="请输入用户名"
            prefix={<UserOutlined />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onPressEnter={handleLogin}
          />
          <Input.Password
            size="large"
            placeholder="请输入密码"
            prefix={<LockOutlined />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleLogin}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
              记住密码
            </Checkbox>
            <a href="#" style={{ fontSize: 14 }}>
              忘记密码？
            </a>
          </div>
          <Button type="primary" size="large" block loading={loading} onClick={handleLogin}>
            登 录
          </Button>
        </Space>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            没有账号？<a href="#">联系管理员创建</a>
          </Text>
        </div>
      </Card>
    </div>
  );
}
