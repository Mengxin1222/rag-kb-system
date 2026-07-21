import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import RouteGuard from './components/RouteGuard';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import QAPage from './pages/QAPage/index';
import SearchPage from './pages/SearchPage/index';
import KBManagePage from './pages/KBManagePage/index';
import DashboardPage from './pages/DashboardPage';
import UserManagePage from './pages/UserManagePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2f6feb',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RouteGuard>
                  <AuthLayout />
                </RouteGuard>
              }
            >
              <Route path="/qa" element={<QAPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route
                path="/kb/manage"
                element={
                  <RouteGuard requireAdmin>
                    <KBManagePage />
                  </RouteGuard>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RouteGuard requireAdmin>
                    <DashboardPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RouteGuard requireAdmin>
                    <UserManagePage />
                  </RouteGuard>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RouteGuard requireAdmin>
                    <SettingsPage />
                  </RouteGuard>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/qa" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
