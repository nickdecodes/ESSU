import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Space, Button, Select, Spin, message } from 'antd';
import { BarChartOutlined, PieChartOutlined, LineChartOutlined, ReloadOutlined, TrophyOutlined, RiseOutlined, FallOutlined, LoadingOutlined } from '@ant-design/icons';
import { api } from '../utils/api';
import { useResponsive } from '../utils/device';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const Statistics = () => {
  const { isMobile } = useResponsive();
  const [summary, setSummary] = useState({});
  const [topProducts, setTopProducts] = useState([]);
  const [productTrend, setProductTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, topProductsRes, trendRes] = await Promise.all([
        api.getStatisticsSummary(days),
        api.getTopProducts(days),
        api.getProductTrend(days)
      ]);
      if (summaryRes.data.success) setSummary(summaryRes.data.data || {});
      if (topProductsRes.data.success) setTopProducts(topProductsRes.data.data || []);
      if (trendRes.data.success) setProductTrend(trendRes.data.data || []);
    } catch (error) {
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days]);

  const revenueColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <span>
          {index < 3 && <TrophyOutlined style={{ marginRight: 4 }} />}
          {index + 1}
        </span>
      )
    },
    {
      title: '产品名称',
      dataIndex: 'entity_name',
      key: 'entity_name',
      width: 150,
      render: (text) => text
    },
    {
      title: '销量',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 80,
      align: 'center',
      render: (quantity) => `${quantity}个`
    },
    {
      title: '收入',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      width: 100,
      align: 'right',
      render: (revenue) => `¥${(revenue || 0).toFixed(2)}`
    },
    {
      title: '成本',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 100,
      align: 'right',
      render: (cost) => `¥${(cost || 0).toFixed(2)}`
    },
    {
      title: '利润',
      dataIndex: 'total_profit',
      key: 'total_profit',
      width: 100,
      align: 'right',
      render: (profit) => (
        <span>
          {profit > 0 && <RiseOutlined style={{ marginRight: 4 }} />}
          {profit < 0 && <FallOutlined style={{ marginRight: 4 }} />}
          ¥{(profit || 0).toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <Spin 
      spinning={loading}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 时间筛选 */}
      <Card style={{ borderRadius: '8px' }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <span>统计时间范围：</span>
          <Select 
            value={days} 
            onChange={setDays} 
            style={{ width: isMobile ? '100%' : 120 }}
          >
            <Select.Option value={7}>最近7天</Select.Option>
            <Select.Option value={30}>最近30天</Select.Option>
            <Select.Option value={90}>最近90天</Select.Option>
            <Select.Option value={365}>最近1年</Select.Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />}
            onClick={loadData}
            size={isMobile ? 'large' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {/* 收益统计 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总收入" 
              value={summary.total_revenue || 0} 
              precision={2}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总成本" 
              value={summary.total_cost || 0} 
              precision={2}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总利润" 
              value={summary.total_profit || 0} 
              precision={2}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="销量总数" 
              value={summary.total_quantity || 0} 
              suffix="个"
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 产品收益排行榜 */}
      <Card 
        title={<><TrophyOutlined /> 产品收益排行榜 (TOP 10)</>}
        style={{ borderRadius: '8px' }}
      >
        <Table 
          columns={revenueColumns} 
          dataSource={topProducts} 
          rowKey="entity_id" 
          loading={loading}
          pagination={false}
          scroll={{ x: isMobile ? 500 : 600 }}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>

      {/* 收益趋势图 */}
      <Card 
        title={<><LineChartOutlined /> 收益趋势图</>}
        style={{ borderRadius: '8px' }}
      >
        <div style={{ height: '450px', padding: '30px 20px', position: 'relative' }}>
          {productTrend.length > 0 && (
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                {/* 渐变定义 */}
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1890ff" />
                  <stop offset="50%" stopColor="#52c41a" />
                  <stop offset="100%" stopColor="#1890ff" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#52c41a" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#52c41a" stopOpacity="0.05" />
                </linearGradient>
                {/* 阴影滤镜 */}
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1890ff" floodOpacity="0.3"/>
                </filter>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/> 
                  </feMerge>
                </filter>
              </defs>
              
              {/* 背景网格 */}
              {[0, 20, 40, 60, 80, 100].map(y => (
                <line 
                  key={y}
                  x1="80" 
                  y1={50 + (y * 3.2)} 
                  x2="95%" 
                  y2={50 + (y * 3.2)}
                  stroke="#d9d9d9"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.4"
                />
              ))}
              
              {/* 数据区域填充 */}
              {productTrend.length > 1 && (() => {
                const maxProfit = Math.max(...productTrend.map(d => d.total_profit), 1);
                const areaPoints = productTrend.map((d, i) => {
                  const x = 80 + (i / (productTrend.length - 1)) * (window.innerWidth * 0.75);
                  const y = 370 - (d.total_profit / maxProfit) * 320;
                  return `${x},${y}`;
                }).join(' ');
                const baseY = 370;
                const firstX = 80;
                const lastX = 80 + (window.innerWidth * 0.75);
                
                return (
                  <polygon
                    points={`${firstX},${baseY} ${areaPoints} ${lastX},${baseY}`}
                    fill="url(#areaGradient)"
                    opacity="0.6"
                  />
                );
              })()}
              
              {/* 主数据线 */}
              {productTrend.length > 1 && (() => {
                const maxProfit = Math.max(...productTrend.map(d => d.total_profit), 1);
                const points = productTrend.map((d, i) => {
                  const x = 80 + (i / (productTrend.length - 1)) * (window.innerWidth * 0.75);
                  const y = 370 - (d.total_profit / maxProfit) * 320;
                  return `${x},${y}`;
                }).join(' ');
                
                return (
                  <>
                    {/* 阴影线 */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#52c41a"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.2"
                      transform="translate(2, 2)"
                    />
                    {/* 主线 */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                    />
                  </>
                );
              })()}
              
              {/* 数据点 */}
              {productTrend.map((d, i) => {
                const maxProfit = Math.max(...productTrend.map(d => d.total_profit), 1);
                const x = 80 + (i / Math.max(productTrend.length - 1, 1)) * (window.innerWidth * 0.75);
                const y = 370 - (d.total_profit / maxProfit) * 320;
                return (
                  <g key={i}>
                    {/* 外圈光晕 */}
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="#52c41a"
                      opacity="0.2"
                      filter="url(#glow)"
                    />
                    {/* 主圆点 */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="white"
                      stroke="#52c41a"
                      strokeWidth="3"
                      filter="url(#dropShadow)"
                    />
                    {/* 内心点 */}
                    <circle
                      cx={x}
                      cy={y}
                      r="2"
                      fill="#52c41a"
                    />
                    {/* 数值标签 */}
                    <text
                      x={x}
                      y={y - 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill="rgba(0, 0, 0, 0.85)"
                      fontWeight="600"
                      opacity="0.8"
                    >
                      ¥{d.total_profit.toFixed(0)}
                    </text>
                  </g>
                );
              })}
              
              {/* Y轴标签 */}
              {productTrend.length > 0 && (() => {
                const maxProfit = Math.max(...productTrend.map(d => d.total_profit), 1);
                return [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
                  <text
                    key={i}
                    x="75"
                    y={375 - (ratio * 320)}
                    textAnchor="end"
                    fontSize="12"
                    fill="rgba(0, 0, 0, 0.45)"
                    fontWeight="500"
                  >
                    ¥{(maxProfit * ratio).toFixed(0)}
                  </text>
                ));
              })()}
              
              {/* X轴标签 */}
              {productTrend.map((d, i) => {
                if (i % Math.ceil(productTrend.length / 6) === 0 || i === productTrend.length - 1) {
                  const x = 80 + (i / Math.max(productTrend.length - 1, 1)) * (window.innerWidth * 0.75);
                  return (
                    <g key={i}>
                      {/* 垂直线 */}
                      <line
                        x1={x}
                        y1="370"
                        x2={x}
                        y2="375"
                        stroke="#d9d9d9"
                        strokeWidth="2"
                      />
                      {/* 文本标签 */}
                      <text
                        x={x}
                        y="390"
                        textAnchor="middle"
                        fontSize="11"
                        fill="rgba(0, 0, 0, 0.45)"
                        fontWeight="500"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                }
                return null;
              })}
              
              {/* 轴线 */}
              <line x1="80" y1="50" x2="80" y2="370" stroke="#d9d9d9" strokeWidth="2" opacity="0.6" />
              <line x1="80" y1="370" x2="95%" y2="370" stroke="#d9d9d9" strokeWidth="2" opacity="0.6" />
            </svg>
          )}
          {productTrend.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <LineChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <span>暂无数据</span>
            </div>
          )}
        </div>
      </Card>
      </Space>
    </Spin>
  );
};

export default Statistics;
