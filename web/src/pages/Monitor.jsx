import { useEffect, useState } from 'react';
import { Card, Row, Col, Progress, Statistic, Table, Tag, Space, Alert, Select, Spin } from 'antd';
import { 
  DashboardOutlined, 
  HddOutlined, 
  CloudServerOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { api } from '../utils/api';
import { useResponsive } from '../utils/device';

const Monitor = () => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [systemData, setSystemData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(600000); // 默认 10 分钟

  // 刷新间隔选项
  const refreshOptions = [
    { label: '关闭自动刷新', value: 0 },
    { label: '每 3 秒', value: 3000 },
    { label: '每 5 秒', value: 5000 },
    { label: '每 10 秒', value: 10000 },
    { label: '每 30 秒', value: 30000 },
    { label: '每 1 分钟', value: 60000 },
    { label: '每 5 分钟', value: 300000 },
    { label: '每 10 分钟', value: 600000 },
  ];

  // 获取系统监控数据
  const fetchSystemData = async () => {
    try {
      const response = await api.getSystemDashboard();
      if (response.data.success) {
        setSystemData(response.data);
        setError(null);
      }
    } catch (err) {
      setError(err.message || '获取系统信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();

    // 自动刷新
    let interval;
    if (refreshInterval > 0) {
      interval = setInterval(fetchSystemData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshInterval]);

  // 获取状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'success';
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return 'default';
    }
  };

  // 获取进度条颜色
  const getProgressColor = (percent) => {
    if (percent >= 90) return '#ff4d4f';
    if (percent >= 80) return '#faad14';
    return '#52c41a';
  };

  // 磁盘表格列 - 响应式配置
  const diskColumns = isMobile ? [
    {
      title: '磁盘',
      dataIndex: 'mountpoint',
      key: 'mountpoint',
      render: (mountpoint, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{mountpoint}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.device}</div>
        </div>
      ),
    },
    {
      title: '使用情况',
      key: 'usage',
      render: (_, record) => (
        <div>
          <Progress 
            percent={record.percent} 
            size="small" 
            strokeColor={getProgressColor(record.percent)}
            style={{ marginBottom: 4 }}
          />
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.used} / {record.total} GB
          </div>
        </div>
      ),
    },
  ] : [
    {
      title: '挂载点',
      dataIndex: 'mountpoint',
      key: 'mountpoint',
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
    },
    {
      title: '文件系统',
      dataIndex: 'fstype',
      key: 'fstype',
    },
    {
      title: '总容量',
      dataIndex: 'total',
      key: 'total',
      render: (val) => `${val} GB`,
    },
    {
      title: '已使用',
      dataIndex: 'used',
      key: 'used',
      render: (val) => `${val} GB`,
    },
    {
      title: '可用',
      dataIndex: 'free',
      key: 'free',
      render: (val) => `${val} GB`,
    },
    {
      title: '使用率',
      dataIndex: 'percent',
      key: 'percent',
      render: (percent, record) => (
        <Space>
          <Progress 
            percent={percent} 
            size="small" 
            strokeColor={getProgressColor(percent)}
            style={{ width: 100 }}
          />
          <Tag color={getStatusColor(record.status)}>
            {record.status}
          </Tag>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        message="错误"
        description={error}
        type="error"
        showIcon
        style={{ margin: 20 }}
      />
    );
  }

  if (loading || !systemData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 16
      }}>
        <Spin size="large" />
        <div style={{ color: '#999', fontSize: 14 }}>正在加载系统监控数据...</div>
      </div>
    );
  }

  const { cpu, memory, swap, disks, network, process, system } = systemData;

  return (
    <div key={isMobile ? 'mobile' : 'desktop'} style={{ padding: isMobile ? 12 : 20 }}>
      {/* 标题和刷新控制 */}
      <Row justify="space-between" align={isMobile ? 'start' : 'middle'} style={{ marginBottom: isMobile ? 12 : 20 }} gutter={[0, 12]}>
        <Col xs={24} sm={12}>
          <h2 style={{ fontSize: isMobile ? '18px' : '24px', margin: 0 }}>
            <DashboardOutlined /> 系统监控中心
          </h2>
        </Col>
        <Col xs={24} sm={12} style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <Space direction={isMobile ? 'vertical' : 'horizontal'} size="small" style={{ width: isMobile ? '100%' : 'auto' }}>
            <Space size="small">
              <ReloadOutlined 
                spin={refreshInterval > 0} 
                style={{ fontSize: 16, color: refreshInterval > 0 ? '#1890ff' : '#999' }}
              />
              <span style={{ fontSize: isMobile ? 12 : 14 }}>刷新间隔:</span>
              <Select
                value={refreshInterval}
                onChange={setRefreshInterval}
                style={{ width: isMobile ? 120 : 140 }}
                size={isMobile ? 'small' : 'middle'}
                options={refreshOptions}
              />
            </Space>
            {!isMobile && (
              <span style={{ color: '#999', fontSize: 12 }}>
                更新: {new Date(systemData.timestamp).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            )}
          </Space>
        </Col>
      </Row>

      {/* CPU、内存和交换分区 */}
      {isMobile ? (
        // 移动端：横向滚动卡片
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          overflowX: 'auto',
          paddingBottom: 8,
          scrollbarWidth: 'thin'
        }}>
          {/* CPU */}
          <Card 
            title={
              <Space size="small">
                <ThunderboltOutlined />
                <span style={{ fontSize: 14 }}>CPU</span>
                <Tag color={getStatusColor(cpu?.status)} style={{ fontSize: 10 }}>
                  {cpu?.status}
                </Tag>
              </Space>
            }
            variant="borderless"
            style={{ minWidth: 240, flex: '0 0 auto' }}
            styles={{ body: { padding: 16, textAlign: 'center' } }}
          >
            <Progress
              type="circle"
              percent={cpu?.usage_percent || 0}
              strokeColor={getProgressColor(cpu?.usage_percent || 0)}
              format={(percent) => `${percent}%`}
              size={100}
            />
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Statistic 
                  title="逻辑核心" 
                  value={cpu?.count?.logical || 0} 
                  suffix="核"
                  valueStyle={{ fontSize: 18 }}
                />
                <Statistic 
                  title="物理核心" 
                  value={cpu?.count?.physical || 0} 
                  suffix="核"
                  valueStyle={{ fontSize: 18 }}
                />
                {cpu?.frequency && (
                  <Statistic 
                    title="当前频率" 
                    value={cpu.frequency.current} 
                    suffix="MHz"
                    valueStyle={{ fontSize: 18 }}
                  />
                )}
              </Space>
            </div>
          </Card>

          {/* 内存 */}
          <Card 
            title={
              <Space size="small">
                <CloudServerOutlined />
                <span style={{ fontSize: 14 }}>内存</span>
                <Tag color={getStatusColor(memory?.status)} style={{ fontSize: 10 }}>
                  {memory?.status}
                </Tag>
              </Space>
            }
            variant="borderless"
            style={{ minWidth: 240, flex: '0 0 auto' }}
            styles={{ body: { padding: 16, textAlign: 'center' } }}
          >
            <Progress
              type="circle"
              percent={memory?.percent || 0}
              strokeColor={getProgressColor(memory?.percent || 0)}
              format={(percent) => `${percent}%`}
              size={100}
            />
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Statistic 
                  title="总内存" 
                  value={memory?.total || 0} 
                  suffix="GB"
                  valueStyle={{ fontSize: 18 }}
                />
                <Statistic 
                  title="已使用" 
                  value={memory?.used || 0} 
                  suffix="GB"
                  valueStyle={{ fontSize: 18 }}
                />
                <Statistic 
                  title="可用" 
                  value={memory?.available || 0} 
                  suffix="GB"
                  valueStyle={{ fontSize: 18 }}
                />
              </Space>
            </div>
          </Card>

          {/* 交换分区 */}
          <Card 
            title={
              <Space size="small">
                <HddOutlined />
                <span style={{ fontSize: 14 }}>交换分区</span>
                <Tag color={getStatusColor(swap?.status)} style={{ fontSize: 10 }}>
                  {swap?.status}
                </Tag>
              </Space>
            }
            variant="borderless"
            style={{ minWidth: 240, flex: '0 0 auto' }}
            styles={{ body: { padding: 16, textAlign: 'center' } }}
          >
            <Progress
              type="circle"
              percent={swap?.percent || 0}
              strokeColor={getProgressColor(swap?.percent || 0)}
              format={(percent) => `${percent}%`}
              size={100}
            />
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Statistic 
                  title="总容量" 
                  value={swap?.total || 0} 
                  suffix="GB"
                  valueStyle={{ fontSize: 18 }}
                />
                <Statistic 
                  title="已使用" 
                  value={swap?.used || 0} 
                  suffix="GB"
                  valueStyle={{ fontSize: 18 }}
                />
                <Statistic 
                  title="可用" 
                  value={swap?.free || 0} 
                  suffix="GB"
                  valueStyle={{ fontSize: 18 }}
                />
              </Space>
            </div>
          </Card>
        </div>
      ) : (
        // 桌面端：网格布局
        <Row gutter={[16, 16]}>
          {/* CPU */}
          <Col xs={24} sm={12} lg={8}>
            <Card 
              title={
                <Space size="small">
                  <ThunderboltOutlined />
                  <span>CPU</span>
                  <Tag color={getStatusColor(cpu?.status)}>
                    {cpu?.status}
                  </Tag>
                </Space>
              }
              variant="borderless"
              styles={{ body: { padding: 24, textAlign: 'center' } }}
            >
              <Progress
                type="circle"
                percent={cpu?.usage_percent || 0}
                strokeColor={getProgressColor(cpu?.usage_percent || 0)}
                format={(percent) => `${percent}%`}
                size={120}
              />
              <div style={{ marginTop: 20 }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic 
                      title="逻辑核心" 
                      value={cpu?.count?.logical || 0} 
                      suffix="核"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="物理核心" 
                      value={cpu?.count?.physical || 0} 
                      suffix="核"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                  {cpu?.frequency && (
                    <Col span={24}>
                      <Statistic 
                        title="当前频率" 
                        value={cpu.frequency.current} 
                        suffix="MHz"
                        valueStyle={{ fontSize: 24 }}
                      />
                    </Col>
                  )}
                </Row>
              </div>
            </Card>
          </Col>

          {/* 内存 */}
          <Col xs={24} sm={12} lg={8}>
            <Card 
              title={
                <Space size="small">
                  <CloudServerOutlined />
                  <span>内存</span>
                  <Tag color={getStatusColor(memory?.status)}>
                    {memory?.status}
                  </Tag>
                </Space>
              }
              variant="borderless"
              styles={{ body: { padding: 24, textAlign: 'center' } }}
            >
              <Progress
                type="circle"
                percent={memory?.percent || 0}
                strokeColor={getProgressColor(memory?.percent || 0)}
                format={(percent) => `${percent}%`}
                size={120}
              />
              <div style={{ marginTop: 20 }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic 
                      title="总内存" 
                      value={memory?.total || 0} 
                      suffix="GB"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="已使用" 
                      value={memory?.used || 0} 
                      suffix="GB"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic 
                      title="可用" 
                      value={memory?.available || 0} 
                      suffix="GB"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>

          {/* 交换分区 */}
          <Col xs={24} sm={12} lg={8}>
            <Card 
              title={
                <Space size="small">
                  <HddOutlined />
                  <span>交换分区</span>
                  <Tag color={getStatusColor(swap?.status)}>
                    {swap?.status}
                  </Tag>
                </Space>
              }
              variant="borderless"
              styles={{ body: { padding: 24, textAlign: 'center' } }}
            >
              <Progress
                type="circle"
                percent={swap?.percent || 0}
                strokeColor={getProgressColor(swap?.percent || 0)}
                format={(percent) => `${percent}%`}
                size={120}
              />
              <div style={{ marginTop: 20 }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic 
                      title="总容量" 
                      value={swap?.total || 0} 
                      suffix="GB"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="已使用" 
                      value={swap?.used || 0} 
                      suffix="GB"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic 
                      title="可用" 
                      value={swap?.free || 0} 
                      suffix="GB"
                      valueStyle={{ fontSize: 24 }}
                    />
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 磁盘信息 */}
      {isMobile ? (
        // 移动端：横向滑动卡片列表
        <div style={{ marginTop: 12 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 12,
            paddingLeft: 4
          }}>
            <HddOutlined style={{ fontSize: 16, marginRight: 8 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>磁盘信息</span>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            overflowX: 'auto',
            paddingBottom: 8,
            scrollbarWidth: 'thin'
          }}>
            {disks?.map((disk, index) => (
              <Card 
                key={index}
                variant="borderless"
                style={{ 
                  minWidth: 280,
                  flex: '0 0 auto'
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 14 }}>
                        {disk.mountpoint}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {disk.device}
                      </div>
                    </div>
                    <Tag color={getStatusColor(disk.status)} style={{ fontSize: 10 }}>
                      {disk.status}
                    </Tag>
                  </div>
                  <Progress 
                    percent={disk.percent} 
                    strokeColor={getProgressColor(disk.percent)}
                    size="small"
                  />
                  <Row gutter={8}>
                    <Col span={8}>
                      <div style={{ fontSize: 11, color: '#999' }}>总容量</div>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>{disk.total} GB</div>
                    </Col>
                    <Col span={8}>
                      <div style={{ fontSize: 11, color: '#999' }}>已使用</div>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>{disk.used} GB</div>
                    </Col>
                    <Col span={8}>
                      <div style={{ fontSize: 11, color: '#999' }}>可用</div>
                      <div style={{ fontSize: 14, fontWeight: 'bold' }}>{disk.free} GB</div>
                    </Col>
                  </Row>
                </Space>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        // 桌面端：表格形式
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card 
              title={
                <Space size="small">
                  <HddOutlined />
                  <span>磁盘信息</span>
                </Space>
              }
              variant="borderless"
              styles={{ body: { padding: 24 } }}
            >
              <Table
                columns={diskColumns}
                dataSource={disks?.map((disk, index) => ({ ...disk, key: index }))}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 网络和进程信息 */}
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginTop: isMobile ? 12 : 16 }}>
        {/* 网络 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space size="small">
                <ApiOutlined />
                <span style={{ fontSize: isMobile ? 14 : 16 }}>网络信息</span>
              </Space>
            }
            variant="borderless"
            style={{ height: '100%' }}
            styles={{ body: { padding: isMobile ? 16 : 24 } }}
          >
            <Row gutter={[8, 12]}>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="发送" 
                  value={network?.bytes_sent || 0} 
                  suffix="GB"
                  precision={2}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="接收" 
                  value={network?.bytes_recv || 0} 
                  suffix="GB"
                  precision={2}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="发送包" 
                  value={network?.packets_sent || 0}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="接收包" 
                  value={network?.packets_recv || 0}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col span={24}>
                <Statistic 
                  title="活动连接" 
                  value={network?.connections || 0}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 进程 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space size="small">
                <CloudServerOutlined />
                <span style={{ fontSize: isMobile ? 14 : 16 }}>当前进程</span>
              </Space>
            }
            variant="borderless"
            style={{ height: '100%' }}
            styles={{ body: { padding: isMobile ? 16 : 24 } }}
          >
            <Row gutter={[8, 12]}>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="进程 ID" 
                  value={process?.pid || 0}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="线程数" 
                  value={process?.threads || 0}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="CPU 使用" 
                  value={process?.cpu_percent || 0} 
                  suffix="%"
                  precision={2}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col xs={12} sm={12}>
                <Statistic 
                  title="内存使用" 
                  value={process?.memory?.rss || 0} 
                  suffix="MB"
                  precision={2}
                  valueStyle={{ fontSize: isMobile ? 18 : 24 }}
                />
              </Col>
              <Col span={24}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#999', marginTop: 8 }}>
                  <ClockCircleOutlined /> 启动时间: {
                    process?.create_time 
                      ? new Date(process.create_time).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'
                  }
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 系统信息 */}
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ marginTop: isMobile ? 12 : 16 }}>
        <Col span={24}>
          <Card 
            title={
              <Space size="small">
                <DashboardOutlined />
                <span style={{ fontSize: isMobile ? 14 : 16 }}>系统信息</span>
              </Space>
            }
            variant="borderless"
            styles={{ body: { padding: isMobile ? 16 : 24 } }}
          >
            <Row gutter={[8, 12]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="系统平台" 
                  value={system?.platform || '-'}
                  valueStyle={{ fontSize: isMobile ? 16 : 24 }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="Python 版本" 
                  value={system?.python_version || '-'}
                  valueStyle={{ fontSize: isMobile ? 16 : 24 }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic 
                  title="运行时长" 
                  value={system?.uptime || '-'}
                  valueStyle={{ fontSize: isMobile ? 16 : 24 }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: '#999' }}>
                  <ClockCircleOutlined /> 启动时间<br />
                  {system?.boot_time ? new Date(system.boot_time).toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Monitor;
