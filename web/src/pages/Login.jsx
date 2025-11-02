import { LockOutlined, MoonOutlined, SmileOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Card, Checkbox, Flex, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useResponsive } from '../utils/device';
import { useTheme } from '../utils/theme';

const { Title, Text } = Typography;

const Leaf = ({ top, left, right, bottom, size, duration, rotation, reverse }) => (
  <div style={{
    position: 'absolute',
    top, left, right, bottom,
    width: size[0],
    height: size[1],
    background: 'linear-gradient(135deg, rgba(34, 139, 34, 0.4) 0%, rgba(107, 142, 35, 0.3) 50%, rgba(154, 205, 50, 0.2) 100%)',
    borderRadius: '0 100% 0 100%',
    animation: `leafFloat ${duration}s ease-in-out infinite ${reverse ? 'reverse' : ''}`,
    transform: `rotate(${rotation}deg)`,
    border: '2px solid rgba(34, 139, 34, 0.2)',
    opacity: 'var(--leaf-opacity)',
    transition: 'opacity 0.3s ease'
  }} />
);

const Login = ({ onLogin }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { darkMode, toggleTheme, themeMode } = useTheme();
  const { isMobile } = useResponsive();

  useEffect(() => {
    const bgColor = darkMode ? '#001529' : '#f0f2f5';
    document.documentElement.style.background = bgColor;
    document.body.style.background = bgColor;
    document.documentElement.style.setProperty('--leaf-opacity', darkMode ? '0.3' : '1');

    const savedCredentials = localStorage.getItem('loginCredentials');
    if (savedCredentials) {
      const { username, password } = JSON.parse(savedCredentials);
      form.setFieldsValue({ username, password, remember: true });
    }
  }, [form, darkMode]);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await api.login(values);
      if (response.data.success) {
        values.remember 
          ? localStorage.setItem('loginCredentials', JSON.stringify({ username: values.username, password: values.password }))
          : localStorage.removeItem('loginCredentials');
        message.success('登录成功');
        onLogin(response.data.user);
      } else {
        message.error(response.data.message || '用户名或密码错误');
      }
    } catch (error) {
      message.error(error.response?.data?.message || '网络连接失败');
    } finally {
      setLoading(false);
    }
  };

  const leaves = [
    { top: '10%', left: '10%', size: [isMobile ? 50 : 80, isMobile ? 75 : 120], duration: 8, rotation: -15 },
    { top: '70%', right: '15%', size: [isMobile ? 40 : 60, isMobile ? 60 : 90], duration: 12, rotation: 25, reverse: true },
    { bottom: '20%', left: '20%', size: [isMobile ? 35 : 50, isMobile ? 52 : 75], duration: 10, rotation: 45 }
  ];

  return (
    <>
      <style>{`
        @keyframes leafFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          33% { transform: translateY(-12px) scale(1.05); }
          66% { transform: translateY(-8px) scale(0.98); }
        }
      `}</style>
      <Flex vertical align="center" justify="center" gap={isMobile ? 32 : 48} style={{ 
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden'
      }}>
        {leaves.map((leaf, i) => <Leaf key={i} {...leaf} />)}
        <Button 
        onClick={toggleTheme}
        icon={themeMode === 'system' ? <SmileOutlined /> : darkMode ? <MoonOutlined /> : <SunOutlined />}
        style={{ 
          position: 'absolute', 
          top: 20, 
          right: 20
        }}
      >
        {themeMode === 'system' ? '自动' : darkMode ? '深色' : '浅色'}
      </Button>

      <Card style={{ 
        width: isMobile ? '90%' : 420, 
        maxWidth: 420,
        background: darkMode ? 'rgba(31, 31, 31, 0.6)' : 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}>
        <Flex vertical align="center" gap="middle" style={{ marginBottom: 24 }}>
          <img src="/essu.png" alt="ESSU" style={{ width: 64, height: 64 }} />
          <Title level={2} style={{ margin: 0 }}>一粟 ESSU</Title>
          <Text type="secondary">寻自然之源，凝香于一珠</Text>
        </Flex>
        
        <Form form={form} onFinish={handleLogin} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input id="login-username" prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password id="login-password" prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked">
            <Checkbox id="login-remember">记住密码</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录系统
            </Button>
          </Form.Item>
        </Form>
      </Card>
        <Text type="secondary">© 2025 一粟 ESSU 出入库系统</Text>
      </Flex>
    </>
  );
};

export default Login;
