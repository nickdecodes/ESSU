import { HomeOutlined, LeftOutlined, LogoutOutlined, MenuOutlined, MoonOutlined, ReloadOutlined, RightOutlined, SmileOutlined, SunOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, ConfigProvider, Drawer, Dropdown, FloatButton, Layout, Menu, theme } from 'antd';
import { useEffect, useState } from 'react';
import UserAvatar from '../components/UserAvatar';
import { useResponsive } from '../utils/device';
import { useTheme } from '../utils/theme';
import { menuConfig } from './menuConfig';

const { Header, Content, Sider } = Layout;

const ThemeToggle = ({ darkMode, themeMode, toggleTheme, collapsed }) => {
  const icon = themeMode === 'system' ? <SmileOutlined /> : darkMode ? <MoonOutlined /> : <SunOutlined />;
  const text = themeMode === 'system' ? '自动' : darkMode ? '深色' : '浅色';
  
  if (collapsed) {
    return (
      <div 
        onClick={toggleTheme}
        style={{
          cursor: 'pointer',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
          fontSize: '16px',
          transition: 'all 0.2s ease',
          marginTop: '8px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'}
        onMouseLeave={(e) => e.currentTarget.style.color = darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'}
        title={themeMode === 'system' ? '跟随系统' : darkMode ? '深色模式' : '浅色模式'}
      >
        {icon}
      </div>
    );
  }

  return (
    <div 
      onClick={toggleTheme}
      style={{
        cursor: 'pointer',
        padding: '4px 12px',
        borderRadius: '8px',
        background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}
      onMouseLeave={(e) => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
    >
      {icon}
      <span style={{ fontSize: '12px' }}>{text}</span>
    </div>
  );
};

const UserInfo = ({ user, darkMode }) => (
  <div style={{
    borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
    paddingTop: '12px',
    textAlign: 'center'
  }}>
    <div style={{
      color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '4px'
    }}>
      {user?.username}
    </div>
    <div style={{
      color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
      fontSize: '12px'
    }}>
      欢迎使用 ESSU 系统
    </div>
  </div>
);

const SiderFooter = ({ darkMode, themeMode, toggleTheme, collapsed, user }) => (
  <div style={{
    padding: collapsed ? '16px 16px 8px 16px' : '16px',
    flexShrink: 0,
    background: darkMode ? '#001529' : '#fff'
  }}>
    {collapsed ? (
      <ThemeToggle darkMode={darkMode} themeMode={themeMode} toggleTheme={toggleTheme} collapsed />
    ) : (
      <div style={{
        background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px',
        padding: '16px',
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span style={{ 
            color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)', 
            fontWeight: '600', 
            fontSize: '14px' 
          }}>
            主题
          </span>
          <ThemeToggle darkMode={darkMode} themeMode={themeMode} toggleTheme={toggleTheme} />
        </div>
        <UserInfo user={user} darkMode={darkMode} />
      </div>
    )}
  </div>
);

export default function MainLayout({ user, onLogout, children, currentTab, onTabChange }) {
  const { isMobile, isDesktop } = useResponsive();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('siderCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const { darkMode, toggleTheme, themeMode } = useTheme();

  useEffect(() => setDrawerVisible(false), [isMobile]);

  useEffect(() => {
    const bgColor = darkMode ? '#000' : '#f0f2f5';
    document.documentElement.style.background = bgColor;
    document.body.style.background = bgColor;
  }, [darkMode]);

  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem('siderCollapsed', JSON.stringify(newCollapsed));
  };

  const menuItems = menuConfig(user?.role);

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <style>{`
        html, body { overscroll-behavior: none; }
        .ant-layout-content { padding: 0 !important; }
      `}</style>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          padding: isMobile ? '0 12px' : '0 24px',
          background: darkMode ? 'rgba(0, 21, 41, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: '64px',
          boxShadow: darkMode ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,21,41,0.08)',
          transition: 'all 0.3s ease',
          borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button 
                  type="text" 
                  icon={<MenuOutlined style={{ fontSize: '18px' }} />} 
                  onClick={() => setDrawerVisible(true)}
                  style={{ marginRight: '-4px', fontSize: '18px' }}
                />
                <Breadcrumb items={[
                  { title: <HomeOutlined /> },
                  { title: menuItems.find(item => item.key === currentTab)?.label || '未知页面' }
                ]} />
              </div>
            )}
            {isDesktop && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/essu.png" alt="ESSU" style={{ width: '32px', height: '32px' }} />
                  <span style={{ color: darkMode ? '#fff' : '#1890ff', fontSize: '20px', fontWeight: '600' }}>ESSU</span>
                </div>
                <span style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: '12px', fontStyle: 'italic' }}>
                  寻自然之源，凝香于一珠
                </span>
              </div>
            )}
          </div>
          
          <Dropdown menu={{ items: [{ key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: onLogout }] }} placement="bottomRight">
            <Button type="text" style={{ height: 'auto', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserAvatar avatarPath={user?.avatar_path} username={user?.username} size={32} preview={false} />
              <span style={{ color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)', fontSize: '14px' }}>
                {user?.username}
              </span>
            </Button>
          </Dropdown>
        </Header>
        
        {isDesktop && (
          <Sider
            collapsed={collapsed}
            trigger={null}
            theme={darkMode ? 'dark' : 'light'}
            width={240}
            collapsedWidth={64}
            style={{ height: 'calc(100vh - 64px)', position: 'fixed', left: 0, top: '64px', zIndex: 99 }}
          >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Button
                type="text"
                icon={collapsed ? <RightOutlined style={{ fontSize: '12px' }} /> : <LeftOutlined style={{ fontSize: '12px' }} />}
                onClick={handleCollapse}
                style={{
                  position: 'absolute',
                  right: '-12px',
                  top: '12px',
                  zIndex: 100,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: darkMode ? '#001529' : '#fff',
                  border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
              />
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <Menu
                  theme={darkMode ? 'dark' : 'light'}
                  mode="inline"
                  selectedKeys={[currentTab]}
                  items={menuItems.map(item => ({
                    key: item.key,
                    icon: item.icon,
                    label: item.label,
                    onClick: () => onTabChange(item.key)
                  }))}
                  style={{ borderRight: 0 }}
                />
              </div>
              <SiderFooter darkMode={darkMode} themeMode={themeMode} toggleTheme={toggleTheme} collapsed={collapsed} user={user} />
            </div>
          </Sider>
        )}
        
        <Layout style={{ 
          marginTop: '64px',
          marginLeft: isDesktop ? (collapsed ? 64 : 240) : 0,
          transition: 'margin-left 0.2s',
          background: darkMode ? '#000' : '#f0f2f5',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <Content 
            style={{ 
              margin: isMobile ? '16px' : '24px',
              padding: 0,
              minHeight: isMobile ? 'calc(100vh - 96px)' : 'calc(100vh - 112px)',
              transition: 'background 0.3s ease'
            }}
          >
            {isDesktop && (
              <Breadcrumb
                style={{ marginBottom: '16px' }}
                items={[
                  { title: <HomeOutlined /> },
                  { title: menuItems.find(item => item.key === currentTab)?.label || '未知页面' }
                ]}
              />
            )}
            {children}
          </Content>
        </Layout>
        
        {isMobile && (
          <Drawer
            title={null}
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            styles={{ body: { padding: 0, background: darkMode ? '#001529' : '#fff', display: 'flex', flexDirection: 'column' }, header: { display: 'none' } }}
            width={240}
          >
            <div style={{ padding: '20px', textAlign: 'center', borderBottom: `1px solid ${darkMode ? '#333' : '#f0f0f0'}` }}>
              <img src="/essu.png" alt="ESSU" style={{ width: '48px', height: '48px', marginBottom: '12px' }} />
              <div style={{ color: darkMode ? 'rgba(255,255,255,0.85)' : '#1890ff', fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>ESSU</div>
              <div style={{ color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: '12px' }}>寻自然之源，凝香于一珠</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <Menu
                theme={darkMode ? 'dark' : 'light'}
                mode="inline"
                selectedKeys={[currentTab]}
                items={menuItems.map(item => ({
                  key: item.key,
                  icon: item.icon,
                  label: item.label,
                  onClick: () => {
                    onTabChange(item.key);
                    setDrawerVisible(false);
                  }
                }))}
                style={{ borderRight: 0 }}
              />
            </div>
            <SiderFooter darkMode={darkMode} themeMode={themeMode} toggleTheme={toggleTheme} collapsed={false} user={user} />
          </Drawer>
        )}
        <FloatButton
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
          tooltip="刷新页面"
          style={{ right: 24, bottom: 24 }}
          styles={{ body: { backgroundColor: '#1890ff', color: '#fff' } }}
        />
      </Layout>
    </ConfigProvider>
  );
}
