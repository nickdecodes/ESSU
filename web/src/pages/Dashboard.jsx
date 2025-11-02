import { Card, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { menuConfig } from '../layouts/menuConfig';
import { useResponsive } from '../utils/device';

const Dashboard = ({ user }) => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const menuItems = menuConfig(user?.role).filter(item => item.key !== 'home');
  const colorMap = {
    material: '#a8e6cf',
    product: '#ffd93d',
    statistics: '#74b9ff',
    records: '#fd79a8',
    user: '#ff7675'
  };

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: '20px',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
        styles={{ body: { padding: isMobile ? '20px' : '40px' } }}
      >
        <div style={{ fontSize: isMobile ? '20px' : '32px', fontWeight: '700', marginBottom: '12px' }}>
          欢迎回来，{user?.username}！
        </div>
        <div style={{ fontSize: isMobile ? '14px' : '16px', opacity: 0.9 }}>
          寻自然之源，凝香于一珠 - ESSU 电商出入库系统
        </div>
      </Card>

      <div style={{ display: 'flex', gap: '8px 16px', flexWrap: 'wrap' }}>
        {menuItems.map((item) => {
          const size = isMobile ? 50 : 60;
          return (
            <Card
              key={item.key}
              hoverable
              onClick={() => navigate(`/${item.key}`)}
              style={{
                flex: '1 1 125px',
                minWidth: '125px',
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
                styles={{ body: { padding: isMobile ? '20px' : '24px', textAlign: 'center' } }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
              >
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: `${colorMap[item.key]}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: isMobile ? '24px' : '28px',
                    color: colorMap[item.key]
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600' }}>
                  {item.label}
                </div>
              </Card>
          );
        })}
      </div>

      <Card
        title="快速开始"
        style={{ borderRadius: '20px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
        styles={{
          header: {
            borderRadius: '20px 20px 0 0',
            fontSize: '18px',
            fontWeight: '600'
          },
          body: { padding: isMobile ? '16px' : '24px' }
        }}
      >
        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
          • 点击上方卡片或左侧菜单可以快速切换到不同功能模块<br />
          • 材料管理：管理材料库存，进行入库和出库操作<br />
          • 产品管理：创建产品配方，管理产品信息<br />
          • 数据统计：查看库存统计和数据分析
          {user?.role === 'admin' && (<><br />• 操作记录：查看所有出入库记录（管理员）<br />• 用户管理：管理系统用户和权限（管理员）</>)}
        </div>
      </Card>
    </Space>
  );
};

export default Dashboard;