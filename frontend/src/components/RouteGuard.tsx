import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function RouteGuard({ children, requireAdmin }: Props) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Result status="403" title="无权限" subTitle="只有管理员可以访问此页面" />;
  }

  return <>{children}</>;
}
