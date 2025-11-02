import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Space, Button, Select, DatePicker, Spin } from 'antd';
import { BarChartOutlined, PieChartOutlined, LineChartOutlined, ReloadOutlined, TrophyOutlined, RiseOutlined, FallOutlined, LoadingOutlined } from '@ant-design/icons';
import { api } from '../utils/api';
import { useResponsive } from '../utils/device';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置dayjs为中文
dayjs.locale('zh-cn');

const { RangePicker } = DatePicker;

const Statistics = () => {
  const { isMobile, isTablet } = useResponsive();
  const [materials, setMaterials] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  const [dateRange, setDateRange] = useState([]);

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    setDateRange([]); // 清空日期选择
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    if (dates && dates.length === 2) {
      setLoading(true);
      // 模拟加载延迟，给用户反馈
      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [materialsRes, formulasRes, recordsRes] = await Promise.all([
        api.getAllMaterials(),
        api.getAllFormulas(),
        api.getAllRecords()
      ]);
      const materialsData = materialsRes.data.data || materialsRes.data;
      const formulasData = formulasRes.data.data || formulasRes.data;
      const recordsData = recordsRes.data.data || recordsRes.data;
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setFormulas(Array.isArray(formulasData) ? formulasData : []);
      setRecords(Array.isArray(recordsData) ? recordsData : []);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 计算收益数据
  const getFilteredRecords = () => {
    let filtered = records;
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filtered = records.filter(record => {
        const recordDate = dayjs(record.created_at);
        return recordDate.isAfter(start.startOf('day')) && recordDate.isBefore(end.endOf('day'));
      });
    } else {
      const now = dayjs();
      let startDate;
      switch (timeRange) {
        case 'day':
          startDate = now.startOf('day');
          break;

        case 'month':
          startDate = now.startOf('month');
          break;
        case 'year':
          startDate = now.startOf('year');
          break;
        default:
          startDate = now.startOf('month');
      }
      filtered = records.filter(record => dayjs(record.created_at).isAfter(startDate));
    }
    return filtered;
  };

  const filteredRecords = getFilteredRecords();
  
  // 产品出库收益统计
  const productOutRecords = filteredRecords.filter(r => r.operation_type === '产品出库');
  const totalRevenue = productOutRecords.reduce((sum, record) => {
    const formula = formulas.find(f => f.formula_id === record.product_id);
    if (formula && record.quantity) {
      const materialCost = formula.materials ? formula.materials.reduce((cost, material) => {
        const mat = materials.find(m => m.material_id === material.product_id);
        return cost + ((mat?.cost_price || 0) * (material.required || 0));
      }, 0) : 0;
      const sellingPrice = materialCost * 1.5; // 假设售价为成本的1.5倍
      return sum + (sellingPrice * record.quantity);
    }
    return sum;
  }, 0);

  const totalCost = productOutRecords.reduce((sum, record) => {
    const formula = formulas.find(f => f.formula_id === record.product_id);
    if (formula && record.quantity) {
      const materialCost = formula.materials ? formula.materials.reduce((cost, material) => {
        const mat = materials.find(m => m.material_id === material.product_id);
        return cost + ((mat?.cost_price || 0) * (material.required || 0));
      }, 0) : 0;
      return sum + (materialCost * record.quantity);
    }
    return sum;
  }, 0);

  const totalProfit = totalRevenue - totalCost;
  const totalSoldProducts = productOutRecords.reduce((sum, r) => sum + (r.quantity || 0), 0);

  // 产品收益排行榜
  const productRevenueStats = {};
  productOutRecords.forEach(record => {
    const formula = formulas.find(f => f.formula_id === record.product_id);
    if (formula && record.quantity) {
      const materialCost = formula.materials ? formula.materials.reduce((cost, material) => {
        const mat = materials.find(m => m.material_id === material.product_id);
        return cost + ((mat?.cost_price || 0) * (material.required || 0));
      }, 0) : 0;
      const sellingPrice = materialCost * 1.5;
      const revenue = sellingPrice * record.quantity;
      const profit = revenue - (materialCost * record.quantity);
      
      if (!productRevenueStats[record.product_id]) {
        productRevenueStats[record.product_id] = {
          product_id: record.product_id,
          name: record.product_name || formula.name,
          soldQuantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };
      }
      productRevenueStats[record.product_id].soldQuantity += record.quantity;
      productRevenueStats[record.product_id].revenue += revenue;
      productRevenueStats[record.product_id].cost += materialCost * record.quantity;
      productRevenueStats[record.product_id].profit += profit;
    }
  });

  const topProducts = Object.values(productRevenueStats)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const revenueColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <span style={{ 
          color: index < 3 ? '#faad14' : 'rgba(0, 0, 0, 0.45)',
          fontWeight: '600'
        }}>
          {index < 3 && <TrophyOutlined style={{ marginRight: 4 }} />}
          {index + 1}
        </span>
      )
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => (
        <span style={{ fontWeight: '500', color: 'rgba(0, 0, 0, 0.85)' }}>
          {text}
        </span>
      )
    },
    {
      title: '销量',
      dataIndex: 'soldQuantity',
      key: 'soldQuantity',
      width: 80,
      align: 'center',
      render: (quantity) => (
        <span style={{ color: '#1890ff', fontWeight: '600' }}>
          {quantity}个
        </span>
      )
    },
    {
      title: '收入',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 100,
      align: 'right',
      render: (revenue) => (
        <span style={{ color: '#52c41a', fontWeight: '600' }}>
          ¥{revenue.toFixed(2)}
        </span>
      )
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      align: 'right',
      render: (cost) => (
        <span style={{ color: '#faad14', fontWeight: '600' }}>
          ¥{cost.toFixed(2)}
        </span>
      )
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      width: 100,
      align: 'right',
      render: (profit) => (
        <span style={{ 
          color: profit > 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: '600'
        }}>
          {profit > 0 && <RiseOutlined style={{ marginRight: 4 }} />}
          {profit < 0 && <FallOutlined style={{ marginRight: 4 }} />}
          ¥{profit.toFixed(2)}
        </span>
      )
    }
  ];

  // 时间统计数据
  const timeStats = {};
  filteredRecords.filter(r => r.operation_type === '产品出库').forEach(record => {
    const dateKey = timeRange === 'day' 
      ? dayjs(record.created_at).format('YYYY-MM-DD')
      : timeRange === 'month'
      ? dayjs(record.created_at).format('YYYY-MM')
      : dayjs(record.created_at).format('YYYY');
    
    if (!timeStats[dateKey]) {
      timeStats[dateKey] = { date: dateKey, revenue: 0, profit: 0, quantity: 0 };
    }
    
    const formula = formulas.find(f => f.formula_id === record.product_id);
    if (formula && record.quantity) {
      const materialCost = formula.materials ? formula.materials.reduce((cost, material) => {
        const mat = materials.find(m => m.material_id === material.product_id);
        return cost + ((mat?.cost_price || 0) * (material.required || 0));
      }, 0) : 0;
      const sellingPrice = materialCost * 1.5;
      const revenue = sellingPrice * record.quantity;
      const profit = revenue - (materialCost * record.quantity);
      
      timeStats[dateKey].revenue += revenue;
      timeStats[dateKey].profit += profit;
      timeStats[dateKey].quantity += record.quantity;
    }
  });

  const timeData = Object.values(timeStats)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // 最近30个时间点

  const timeColumns = [
    {
      title: '时间',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '销量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
      render: (quantity) => (
        <span style={{ color: '#1890ff', fontWeight: '600' }}>
          {quantity}个
        </span>
      )
    },
    {
      title: '收入',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 100,
      align: 'right',
      render: (revenue) => (
        <span style={{ color: '#52c41a', fontWeight: '600' }}>
          ¥{revenue.toFixed(2)}
        </span>
      )
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      width: 100,
      align: 'right',
      render: (profit) => (
        <span style={{ 
          color: profit > 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: '600'
        }}>
          ¥{profit.toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <Spin 
      spinning={loading} 
      indicator={<LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} spin />}
      tip="正在加载数据..."
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 时间筛选 */}
      <Card style={{ borderRadius: '8px', marginBottom: '24px' }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <span style={{ fontWeight: '600', color: 'rgba(0, 0, 0, 0.85)' }}>统计时间范围：</span>
          <Select 
            value={timeRange} 
            onChange={handleTimeRangeChange} 
            style={{ width: isMobile ? '100%' : 120 }}
            size={isMobile ? 'large' : 'middle'}
            getPopupContainer={(triggerNode) => triggerNode.parentElement}
          >
            <Select.Option value="day">按日</Select.Option>
            <Select.Option value="month">按月</Select.Option>
            <Select.Option value="year">按年</Select.Option>
          </Select>
          {timeRange === 'day' && (
            <RangePicker 
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={['开始日期', '结束日期']}
              style={{ width: 240 }}
              allowClear
              format="YYYY-MM-DD"
            />
          )}

          {timeRange === 'month' && (
            <RangePicker 
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={['开始月份', '结束月份']}
              style={{ width: 240 }}
              allowClear
              picker="month"
              format="YYYY-MM"

            />
          )}
          {timeRange === 'year' && (
            <RangePicker 
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder={['开始年份', '结束年份']}
              style={{ width: 240 }}
              allowClear
              picker="year"
              format="YYYY年"
            />
          )}
          <Button 
            onClick={() => { setDateRange([]); setTimeRange('month'); }}
            size={isMobile ? 'large' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            重置
          </Button>
        </Space>
      </Card>

      {/* 收益统计 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总收入" 
              value={totalRevenue} 
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总成本" 
              value={totalCost} 
              precision={2}
              valueStyle={{ color: '#faad14' }}
              prefix={<BarChartOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="总利润" 
              value={totalProfit} 
              precision={2}
              valueStyle={{ color: totalProfit > 0 ? '#52c41a' : '#ff4d4f' }}
              prefix={<TrophyOutlined style={{ color: totalProfit > 0 ? '#52c41a' : '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic 
              title="销量总数" 
              value={totalSoldProducts} 
              suffix="个"
              valueStyle={{ color: '#1890ff' }}
              prefix={<PieChartOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
      </Row>



      {/* 产品收益排行榜 */}
      <Card 
        title={<><TrophyOutlined style={{ color: '#faad14' }} /> 产品收益排行榜 (TOP 10)</>}
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadData} 
            type="default" 
            ghost
            style={{ color: '#faad14', borderColor: '#faad14' }}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? '' : '刷新'}
          </Button>
        }
        style={{ borderRadius: '8px' }}
        styles={{ header: { background: '#FFF8E1', borderRadius: '8px 8px 0 0' } }}
      >
        <Table 
          columns={revenueColumns} 
          dataSource={topProducts} 
          rowKey="product_id" 
          loading={loading}
          pagination={false}
          scroll={{ x: isMobile ? 500 : 600 }}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>

      {/* 收益趋势图 */}
      <Card 
        title={<><LineChartOutlined style={{ color: '#1890ff' }} /> 收益趋势图</>}
        style={{ 
          borderRadius: '12px',
          background: `linear-gradient(135deg, #ffffff 0%, #fafafa 100%)`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ height: '450px', padding: '30px 20px', position: 'relative' }}>
          {timeData.length > 0 && (
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                {/* 渐变定义 */}
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={'#1890ff'} />
                  <stop offset="50%" stopColor={'#52c41a'} />
                  <stop offset="100%" stopColor={'#1890ff'} />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={'#52c41a'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={'#52c41a'} stopOpacity="0.05" />
                </linearGradient>
                {/* 阴影滤镜 */}
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={'#1890ff'} floodOpacity="0.3"/>
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
                  stroke={'#d9d9d9'}
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.4"
                />
              ))}
              
              {/* 数据区域填充 */}
              {timeData.length > 1 && (() => {
                const maxProfit = Math.max(...timeData.map(d => d.profit), 1);
                const areaPoints = timeData.map((d, i) => {
                  const x = 80 + (i / (timeData.length - 1)) * (window.innerWidth * 0.75);
                  const y = 370 - (d.profit / maxProfit) * 320;
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
              {timeData.length > 1 && (() => {
                const maxProfit = Math.max(...timeData.map(d => d.profit), 1);
                const points = timeData.map((d, i) => {
                  const x = 80 + (i / (timeData.length - 1)) * (window.innerWidth * 0.75);
                  const y = 370 - (d.profit / maxProfit) * 320;
                  return `${x},${y}`;
                }).join(' ');
                
                return (
                  <>
                    {/* 阴影线 */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke={'#52c41a'}
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
              {timeData.map((d, i) => {
                const maxProfit = Math.max(...timeData.map(d => d.profit), 1);
                const x = 80 + (i / Math.max(timeData.length - 1, 1)) * (window.innerWidth * 0.75);
                const y = 370 - (d.profit / maxProfit) * 320;
                return (
                  <g key={i}>
                    {/* 外圈光晕 */}
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill={'#52c41a'}
                      opacity="0.2"
                      filter="url(#glow)"
                    />
                    {/* 主圆点 */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="white"
                      stroke={'#52c41a'}
                      strokeWidth="3"
                      filter="url(#dropShadow)"
                    />
                    {/* 内心点 */}
                    <circle
                      cx={x}
                      cy={y}
                      r="2"
                      fill={'#52c41a'}
                    />
                    {/* 数值标签 */}
                    <text
                      x={x}
                      y={y - 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill={rgba(0, 0, 0, 0.85)}
                      fontWeight="600"
                      opacity="0.8"
                    >
                      ¥{d.profit.toFixed(0)}
                    </text>
                  </g>
                );
              })}
              
              {/* Y轴标签 */}
              {timeData.length > 0 && (() => {
                const maxProfit = Math.max(...timeData.map(d => d.profit), 1);
                return [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
                  <text
                    key={i}
                    x="75"
                    y={375 - (ratio * 320)}
                    textAnchor="end"
                    fontSize="12"
                    fill={rgba(0, 0, 0, 0.45)}
                    fontWeight="500"
                  >
                    ¥{(maxProfit * ratio).toFixed(0)}
                  </text>
                ));
              })()}
              
              {/* X轴标签 */}
              {timeData.map((d, i) => {
                if (i % Math.ceil(timeData.length / 6) === 0 || i === timeData.length - 1) {
                  const x = 80 + (i / Math.max(timeData.length - 1, 1)) * (window.innerWidth * 0.75);
                  return (
                    <g key={i}>
                      {/* 垂直线 */}
                      <line
                        x1={x}
                        y1="370"
                        x2={x}
                        y2="375"
                        stroke={'#d9d9d9'}
                        strokeWidth="2"
                      />
                      {/* 文本标签 */}
                      <text
                        x={x}
                        y="390"
                        textAnchor="middle"
                        fontSize="11"
                        fill={rgba(0, 0, 0, 0.45)}
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
              <line x1="80" y1="50" x2="80" y2="370" stroke={'#d9d9d9'} strokeWidth="2" opacity="0.6" />
              <line x1="80" y1="370" x2="95%" y2="370" stroke={'#d9d9d9'} strokeWidth="2" opacity="0.6" />
            </svg>
          )}
          {timeData.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(0, 0, 0, 0.45)'
            }}>
              <LineChartOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
              <span style={{ fontSize: '16px', fontWeight: '500' }}>暂无数据</span>
              <span style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>请选择时间范围查看收益趋势</span>
            </div>
          )}
        </div>
      </Card>
      </Space>
    </Spin>
  );
};

export default Statistics;