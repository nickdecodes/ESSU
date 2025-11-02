import { useEffect } from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import { Config } from './utils/config';
import { ThemeProvider, useTheme } from './utils/theme';

import Login from './pages/Login';
import MainLayout from './layouts';
import Dashboard from './pages/Dashboard';
import Material from './pages/Material';
import Product from './pages/Product';
import User from './pages/User';
import Records from './pages/Records';
import Statistics from './pages/Statistics';
import { useAuth } from './utils/hooks';
import { api } from './utils/api';

function AppContent() {
  const { message } = AntdApp.useApp();
  const { user, handleLogin, handleLogout } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = location.pathname.split('/')[1] || Config.DEFAULT_TAB;

  const handleTabChange = (key) => navigate(`/${key}`);

  useEffect(() => {
    if (!user) return;
    
    const handleSessionExpired = async () => {
      try {
        const sessionId = localStorage.getItem(Config.STORAGE_KEYS.SESSION_ID);
        if (sessionId) await api.logout(user.username, sessionId);
      } catch (error) {
        console.error('登出失败:', error);
      } finally {
        message.warning('会话已过期，请重新登录');
        handleLogout();
      }
    };
    
    const checkSession = async () => {
      try {
        const response = await api.getUsers();
        if (response.status === 401) await handleSessionExpired();
      } catch (error) {
        if (error.response?.status === 401) await handleSessionExpired();
      }
    };
    
    const interval = setInterval(checkSession, Config.SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [user, handleLogout, message]);

  if (!user) return <Routes><Route path="*" element={<Login onLogin={handleLogin} />} /></Routes>;

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return <Dashboard user={user} />;
      case 'material':
        return <Material user={user} />;
      case 'product':
        return <Product user={user} />;
      case 'records':
        return user.role === 'admin' ? <Records /> : null;
      case 'statistics':
        return <Statistics />;
      case 'user':
        return user.role === 'admin' ? <User user={user} /> : null;
      default:
        return null;
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${Config.DEFAULT_TAB}`} replace />} />
      <Route path="/:tab" element={
        <MainLayout
          user={user}
          onLogout={handleLogout}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        >
          {renderContent()}
        </MainLayout>
      } />
      <Route path="*" element={<Navigate to={`/${Config.DEFAULT_TAB}`} replace />} />
    </Routes>
  );
}

const App = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </HashRouter>
  );
};

const ThemedApp = () => {
  const { darkMode } = useTheme();
  
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <AntdApp>
        <AppContent />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;