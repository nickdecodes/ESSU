import { ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Input, Modal, Row, Select, Space, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import { useResponsive } from '../utils/device';

const { RangePicker } = DatePicker;

const Records = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const today = dayjs();
    return [today.startOf('week'), today.endOf('week')];
  });
  const [operationTypeFilter, setOperationTypeFilter] = useState([]);
  const [usernameFilter, setUsernameFilter] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('search'); // 'search' or 'export'
  const { isMobile } = useResponsive();
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for descending, 'asc' for ascending
  const [deleteAfterExport, setDeleteAfterExport] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');


  const loadRecords = async (params = {}) => {
    setLoading(true);
    try {
      const requestParams = {
        page_size: 10000,
        search: params.search || searchText,
        dateRange: params.dateRange || dateRange,
        operationType: params.operationType,
        username: params.username,
        sortOrder: params.sortOrder || sortOrder
      };
      
      const response = await api.getRecords(requestParams);
      const { data } = response.data;
      
      const recordsData = data || [];
      setRecords(recordsData);
      setFilteredRecords(recordsData);
    } catch (error) {
      console.error('加载记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    // 初始加载本周数据
    const today = dayjs();
    const weekRange = [today.startOf('week'), today.endOf('week')];
    loadRecords({ dateRange: weekRange });
  }, []);



  // 快捷日期选择
  const setQuickDateRange = useCallback((type) => {
    const today = dayjs();
    let range = [];
    
    switch(type) {
      case 'today':
        range = [today, today];
        break;
      case 'yesterday':
        range = [today.subtract(1, 'day'), today.subtract(1, 'day')];
        break;
      case 'week':
        range = [today.startOf('week'), today.endOf('week')];
        break;
      case 'month':
        range = [today.startOf('month'), today.endOf('month')];
        break;
      case 'year':
        range = [today.startOf('year'), today.endOf('year')];
        break;
      default:
        range = [];
    }
    
    setDateRange(range);
  }, []);

  const handleSearch = () => {
    loadRecords({ 
      search: debouncedSearchText, 
      dateRange, 
      operationType: operationTypeFilter, 
      username: usernameFilter, 
      sortOrder
    });
    setModalVisible(false);
  };

  const handleExport = () => {
    api.exportRecords({
      search: debouncedSearchText,
      dateRange,
      operationType: operationTypeFilter,
      username: usernameFilter,
      sortOrder,
      deleteAfterExport
    });
    setModalVisible(false);
  };

  const openModal = (type) => {
    setModalType(type);
    // Set default sort order based on modal type
    setSortOrder(type === 'search' ? 'desc' : 'asc');
    setModalVisible(true);
  };

  const clearAllFilters = () => {
    setSearchText('');
    setDebouncedSearchText('');
    setDateRange([]);
    setOperationTypeFilter([]);
    setUsernameFilter([]);
    setSortOrder('desc');
    setDeleteAfterExport(false);
    loadRecords({ search: '', dateRange: [], operationType: [], username: [], sortOrder: 'desc' });
  };

  // 动态生成筛选选项
  const uniqueUsers = useMemo(() => {
    const users = [...new Set(records.map(r => r.username))].filter(Boolean);
    return users.map(user => ({ value: user, label: user }));
  }, [records]);

  const renderSearchBar = () => isMobile ? (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Button type="primary" icon={<SearchOutlined />} onClick={() => openModal('search')} block>
          搜索
        </Button>
      </Col>
      <Col span={12}>
        <Button icon={<ExportOutlined />} onClick={() => openModal('export')} block>
          导出
        </Button>
      </Col>
    </Row>
  ) : (
    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
      <Button type="primary" icon={<SearchOutlined />} onClick={() => openModal('search')}>
        搜索
      </Button>
      <Button icon={<ExportOutlined />} onClick={() => openModal('export')}>
        导出
      </Button>
    </Space>
  );

  // 移动端卡片渲染
  const renderMobileCard = (record) => {
    const getTypeColor = (type) => {
      if (type.includes('登录')) return 'blue';
      if (type.includes('登出')) return 'default';
      if (type.includes('入库')) return 'green';
      if (type.includes('出库')) return 'red';
      if (type.includes('还原')) return 'orange';
      if (type.includes('添加')) return 'cyan';
      if (type.includes('编辑') || type.includes('更新')) return 'blue';
      if (type.includes('删除')) return 'red';
      return 'default';
    };

    return (
      <Card 
        size="small" 
        style={{ marginBottom: '12px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Tag color={getTypeColor(record.operation_type)} style={{ margin: 0 }}>
              {record.operation_type}
            </Tag>
            <span style={{ fontSize: '11px', lineHeight: '22px' }}>
              {dayjs(record.created_at).format('MM-DD HH:mm')}
            </span>
          </div>
          
          <div style={{ fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-all' }}>
            {record.detail}
          </div>
          
          <div style={{ fontSize: '12px', textAlign: 'right' }}>
            操作者：{record.username}
          </div>
        </div>
      </Card>
    );
  };

  const renderMobileCards = () => (
    <div  style={{ marginTop: '16px', height: 'calc(100vh - 200px)', overflow: 'auto' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span>加载中...</span>
        </div>
      ) : filteredRecords.length > 0 ? (
        filteredRecords.map((record, index) => 
          <div key={record.record_id || index}>{renderMobileCard(record)}</div>
        )
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          暂无数据
        </div>
      )}
    </div>
  );

  const renderDesktopTable = () => (
    <div style={{ marginBottom: '12px', marginTop: '16px' }}>
      <Table 
        virtual
        sticky
        columns={getColumns()} 
        dataSource={filteredRecords} 
        rowKey={(record) => `${record.operation_type}-${record.id}`}
        loading={loading}
        pagination={false}
        scroll={{ y: window.innerHeight - 420 }}
        size="middle"
      />
    </div>
  );

  const getColumns = () => [
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      fixed: 'left',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 120,
      render: (type) => {
        let color = 'default';
        if (type.includes('登录')) color = 'blue';
        else if (type.includes('登出')) color = 'default';
        else if (type.includes('入库')) color = 'green';
        else if (type.includes('出库')) color = 'red';
        else if (type.includes('还原')) color = 'orange';
        else if (type.includes('添加')) color = 'cyan';
        else if (type.includes('编辑') || type.includes('更新')) color = 'blue';
        else if (type.includes('删除')) color = 'red';
        return <Tag color={color}>{type}</Tag>;
      }
    },
    {
      title: '操作详情',
      dataIndex: 'detail',
      key: 'detail',
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (detail) => (
        <Tooltip placement="topLeft" title={detail}>
          {detail}
        </Tooltip>
      ),
    },
    {
      title: '操作用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      ellipsis: {
        showTitle: false,
      },
      render: (username) => (
        <Tooltip placement="topLeft" title={username}>
          {username}
        </Tooltip>
      ),
    }
  ];




  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card 
        key={isMobile ? 'mobile' : 'desktop'}
        style={{ borderRadius: '8px' }} 
        styles={{ body: { padding: isMobile ? '16px' : '24px' } }}>
        {renderSearchBar()}
        {isMobile ? renderMobileCards() : renderDesktopTable()}
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px' }}>
          共 {filteredRecords.length} 条记录
        </div>
      </Card>
      
      <Modal
        title={modalType === 'search' ? '搜索操作记录' : '导出操作记录'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="clear" onClick={clearAllFilters}>
            清空筛选
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            onClick={modalType === 'search' ? handleSearch : handleExport}
          >
            {modalType === 'search' ? '确定搜索' : '导出Excel'}
          </Button>
        ]}
        width={isMobile ? '95%' : 600}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="搜索操作详情"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: '100%' }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="选择操作类型"
            allowClear
            mode="multiple"
            value={operationTypeFilter}
            onChange={setOperationTypeFilter}
            style={{ width: '100%' }}
            options={[
              { label: '用户登录', value: '用户登录' },
              { label: '用户登出', value: '用户登出' },
              { label: '材料入库', value: '材料入库' },
              { label: '材料出库', value: '材料出库' },
              { label: '添加材料', value: '添加材料' },
              { label: '编辑材料', value: '编辑材料' },
              { label: '删除材料', value: '删除材料' },
              { label: '产品入库', value: '产品入库' },
              { label: '产品出库', value: '产品出库' },
              { label: '产品还原', value: '产品还原' },
              { label: '添加产品', value: '添加产品' },
              { label: '编辑产品', value: '编辑产品' },
              { label: '删除产品', value: '删除产品' },
              { label: '添加用户', value: '添加用户' },
              { label: '编辑用户', value: '编辑用户' },
              { label: '删除用户', value: '删除用户' }
            ]}
          />
          <Select
            placeholder="选择操作用户"
            allowClear
            mode="multiple"
            value={usernameFilter}
            onChange={setUsernameFilter}
            style={{ width: '100%' }}
            options={uniqueUsers}
          />
          <div>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>快捷选择：</div>
            <Space wrap style={{ marginBottom: '8px' }}>
              <Button size="small" onClick={() => setQuickDateRange('today')}>今天</Button>
              <Button size="small" onClick={() => setQuickDateRange('yesterday')}>昨天</Button>
              <Button size="small" onClick={() => setQuickDateRange('week')}>本周</Button>
              <Button size="small" onClick={() => setQuickDateRange('month')}>本月</Button>
              <Button size="small" onClick={() => setQuickDateRange('year')}>本年</Button>
            </Space>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              allowClear
            />
          </div>
          <Select
            placeholder="时间排序"
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: '100%' }}
            options={[
              { label: '时间倒序（最新在前）', value: 'desc' },
              { label: '时间正序（最早在前）', value: 'asc' }
            ]}
          />
          {modalType === 'export' && (
            <div style={{ padding: '8px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={deleteAfterExport}
                  onChange={(e) => setDeleteAfterExport(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                导出后删除原数据
              </label>
            </div>
          )}
        </Space>
      </Modal>

    </Space>
  );
};

export default Records;