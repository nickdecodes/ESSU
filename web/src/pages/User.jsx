import { DeleteOutlined, EditOutlined, ExportOutlined, ImportOutlined, UserAddOutlined } from '@ant-design/icons';
import { App, Button, Card, Checkbox, Col, Form, Input, List, Modal, Result, Row, Select, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import UserAvatar from '../components/UserAvatar';
import { api } from '../utils/api';
import { Config } from '../utils/config';
import { useResponsive } from '../utils/device';
import { useUsers } from '../utils/hooks';
import { uploadWithImage } from '../utils/upload';

const User = ({ user }) => {
  const { message } = App.useApp();
  const { isMobile } = useResponsive();
  const { users, loadUsers } = useUsers();
  const [searchKeywords, setSearchKeywords] = useState(() => {
    const saved = localStorage.getItem('userSearchKeywords');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!user) return;
    loadUsers(message.error);
  }, [user]);

  useEffect(() => {
    localStorage.setItem('userSearchKeywords', JSON.stringify(searchKeywords));
  }, [searchKeywords]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleteModalVisible, setBatchDeleteModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalForm] = Form.useForm();
  const [modalAvatarFileList, setModalAvatarFileList] = useState([]);
  const [devicesModalVisible, setDevicesModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importHelpVisible, setImportHelpVisible] = useState(false);
  const [importResultVisible, setImportResultVisible] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const handleViewDevices = (user) => {
    setSelectedUser(user);
    setDevicesModalVisible(true);
  };

  const handleRemoveDevice = async (sessionId) => {
    try {
      const response = await api.removeUserSession(selectedUser.username, sessionId, { operator: user.username });
      if (response.data.success) {
        message.success('设备移除成功');
        const currentSessionId = localStorage.getItem('session_id');
        if (response.data.removed_user === user.username && response.data.removed_session === currentSessionId) {
          message.warning('您的当前会话已被移除，即将退出登录');
          setTimeout(() => {
            localStorage.clear();
            window.location.href = '/login';
          }, 2000);
          return;
        }
        const updatedSessions = selectedUser.sessions.filter(s => s.session_id !== sessionId);
        setSelectedUser({ ...selectedUser, sessions: updatedSessions, online_devices: updatedSessions.length });
        await loadUsers();
      } else {
        message.error(response.data.message || '设备移除失败');
      }
    } catch (error) {
      message.error('设备移除失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetModalState = () => {
    modalForm.resetFields();
    setEditingUser(null);
    setModalAvatarFileList([]);
  };

  const openUserModal = (editUser = null) => {
    setEditingUser(editUser);
    if (editUser) {
      modalForm.setFieldsValue({ username: editUser.username, role: editUser.role, password: editUser.password });
      const avatarUrl = editUser.avatar_path?.startsWith('http') 
        ? editUser.avatar_path 
        : editUser.avatar_path ? `${Config.API_BASE_URL}/${editUser.avatar_path}` : null;
      setModalAvatarFileList(avatarUrl ? [{ uid: '-1', name: 'avatar.jpg', status: 'done', url: avatarUrl }] : []);
    } else {
      resetModalState();
    }
    setUserModalVisible(true);
  };

  const closeUserModal = () => {
    setUserModalVisible(false);
    resetModalState();
  };

  const uploadFormData = async (endpoint, data, file, fieldName) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));
    formData.append(fieldName, file);
    const res = await fetch(`${Config.API_BASE_URL}${endpoint}`, { method: 'POST', body: formData });
    return { data: await res.json() };
  };

  const addUser = async (values) => {
    if (userLoading) return;
    setUserLoading(true);
    try {
      const startTime = Date.now();
      const hasFileAvatar = modalAvatarFileList?.length > 0 && modalAvatarFileList[0].originFileObj;
      const hasUrlAvatar = modalAvatarFileList?.length > 0 && modalAvatarFileList[0].url && !modalAvatarFileList[0].originFileObj;
      
      let response;
      if (hasFileAvatar) {
        response = await uploadFormData('/users', {...values, operator: user.username}, modalAvatarFileList[0].originFileObj, 'avatar');
      } else if (hasUrlAvatar) {
        response = await api.addUser({...values, avatar_url: modalAvatarFileList[0].url, operator: user.username});
      } else {
        response = await api.addUser({...values, operator: user.username});
      }
      
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success('用户添加成功');
        closeUserModal();
        setUserLoading(false);
        loadUsers(message.error);
      } else {
        message.error(response.data.message || '用户添加失败');
        setUserLoading(false);
      }
    } catch (error) {
      console.error('用户添加失败:', error);
      message.error('用户添加失败');
      setUserLoading(false);
    }
  };

  const updateCurrentUserSession = async () => {
    const usersResponse = await api.getUsers();
    const updatedUserData = usersResponse.data.find(u => u.id === editingUser.id);
    if (updatedUserData) {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({
        ...savedUser,
        username: updatedUserData.username,
        role: updatedUserData.role,
        avatar_path: updatedUserData.avatar_path
      }));
      window.location.reload();
    }
  };

  const handleSubmitUser = async (values) => {
    if (userLoading) return;
    setUserLoading(true);
    try {
      const startTime = Date.now();
      if (editingUser) {
        const hasFileAvatar = modalAvatarFileList?.length > 0 && modalAvatarFileList[0].originFileObj;
        const hasUrlAvatar = modalAvatarFileList?.length > 0 && modalAvatarFileList[0].url && !modalAvatarFileList[0].originFileObj;
        const additionalData = { username: values.username, role: values.role, operator: user.username };
        if (values.password?.trim() && values.password !== editingUser.password) additionalData.password = values.password;
        
        let response;
        if (hasFileAvatar) {
          response = await uploadWithImage(modalAvatarFileList[0].originFileObj, 'avatar', `/users/${editingUser.id}`, 'PUT', additionalData);
        } else if (hasUrlAvatar) {
          response = await api.updateUser(editingUser.id, { 
            ...additionalData,
            avatar_url: modalAvatarFileList[0].url
          });
        } else {
          response = await api.updateUser(editingUser.id, { 
            ...additionalData,
            avatar_path: modalAvatarFileList.length > 0 ? editingUser.avatar_path : null
          });
        }
        
        if (!response.data.success) {
          message.error(response.data.message || '用户更新失败');
          setUserLoading(false);
          return;
        }
        message.success('用户更新成功');
        
        const elapsed = Date.now() - startTime;
        const minDelay = Math.max(0, 500 - elapsed);
        if (minDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, minDelay));
        }
        
        if (editingUser.username === user.username || values.username === user.username) {
          await updateCurrentUserSession();
        }
        
        closeUserModal();
        setUserLoading(false);
        loadUsers();
      } else {
        await addUser(values);
      }
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
      setUserLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (batchDeleteLoading) return;
    setBatchDeleteLoading(true);
    try {
      const startTime = Date.now();
      const usernamesToDelete = selectedRowKeys.map(id => users.find(u => u.id === id)?.username).filter(Boolean);
      await Promise.all(usernamesToDelete.map(username => api.deleteUser(username, { operator: user.username })));
      
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      message.success(`成功删除 ${selectedRowKeys.length} 个用户`);
    } catch (error) {
      message.error(error.response?.data?.message || '批量删除失败');
    } finally {
      setBatchDeleteModalVisible(false);
      setSelectedRowKeys([]);
      setBatchDeleteLoading(false);
      loadUsers();
    }
  };

  const filterUser = (input, option) => {
    const foundUser = users.find(u => u.id === option.value);
    return foundUser && (
      foundUser.username.toLowerCase().includes(input.toLowerCase()) ||
      foundUser.role.toLowerCase().includes(input.toLowerCase())
    );
  };

  const getSearchOptions = () => users.map(u => ({
    value: u.id,
    label: (
      <Space size="middle">
        <UserAvatar avatarPath={u.avatar_path} username={u.username} size={20} />
        <span>{u.username}-{u.role === 'admin' ? <Tag color="gold">管理员</Tag> : <Tag>普通用户</Tag>}</span>
      </Space>
    )
  }));

  const filteredUsers = searchKeywords.length === 0 ? users : users.filter(u => searchKeywords.includes(u.id));

  const CELL_HEIGHT = 60;

  const getColumns = () => [
    {
      title: '头像',
      dataIndex: 'avatar_path',
      key: 'avatar_path',
      width: 80,
      align: 'center',
      render: (avatarPath, record) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserAvatar avatarPath={avatarPath} username={record.username} size={50} />
        </div>
      )
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: isMobile ? 100 : 200,
      render: (text) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center' }}>
          <Tooltip title={text.length > (isMobile ? 8 : 16) ? text : null}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '100px' : '200px' }}>
              {text}
            </span>
          </Tooltip>
        </div>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.role.localeCompare(b.role),
      render: (role) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {role === 'admin' ? <Tag color="gold">管理员</Tag> : <Tag>普通用户</Tag>}
        </div>
      )
    },
    {
      title: '设备',
      dataIndex: 'online_devices',
      key: 'online_devices',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.online_devices || 0) - (b.online_devices || 0),
      render: (count, record) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {count > 0 ? (
            <Button size="small" type="link" onClick={() => handleViewDevices(record)}>{count}台</Button>
          ) : (
            <span>0台</span>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => openUserModal(record)}>
            编辑
          </Button>
        </div>
      )
    }
  ];

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('operator', user.username);
    
    try {
      const startTime = Date.now();
      const response = await api.importUsers(formData);
      
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      setImportResult(response.data);
      setImportResultVisible(true);
      
      if (response.data.success) {
        loadUsers();
      }
    } catch (error) {
      console.error('导入失败:', error);
      setImportResult({
        success: false,
        message: '导入失败：' + (error.response?.data?.message || error.message)
      });
      setImportResultVisible(true);
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const userIds = selectedRowKeys.length > 0 
        ? selectedRowKeys.join(',') 
        : filteredUsers.map(u => u.id).join(',');
      api.exportUsers(userIds, user.username);
    } finally {
      setExportLoading(false);
    }
  };

  const renderMobileSearchBar = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Select
          id="user-search"
          mode="multiple"
          value={searchKeywords}
          onChange={setSearchKeywords}
          options={getSearchOptions()}
          placeholder="搜索用户"
          style={{ width: '100%' }}
          allowClear
          showSearch
          filterOption={filterUser}
          maxTagCount="responsive"
          getPopupContainer={(triggerNode) => triggerNode.parentElement}
        />
      </Col>
      <Col span={12}>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => openUserModal()} block>
          添加
        </Button>
      </Col>
      <Col span={12}>
        <Button icon={<ImportOutlined />} onClick={() => setImportHelpVisible(true)} loading={importLoading} disabled={importLoading} block>
          导入
        </Button>
      </Col>
      <Col span={12}>
        <Button icon={<ExportOutlined />} onClick={handleExport} loading={exportLoading} disabled={exportLoading} block>
          导出{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
        </Button>
      </Col>
      <Col span={12}>
        <Button icon={<DeleteOutlined />} onClick={() => setBatchDeleteModalVisible(true)} disabled={selectedRowKeys.length === 0} loading={batchDeleteLoading} danger block>
          删除{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
        </Button>
      </Col>
    </Row>
  );

  const renderDesktopSearchBar = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Select
        id="user-search"
        mode="multiple"
        value={searchKeywords}
        onChange={setSearchKeywords}
        options={getSearchOptions()}
        placeholder="选择用户进行搜索"
        style={{ width: '100%' }}
        allowClear
        showSearch
        filterOption={filterUser}
        maxTagCount="responsive"
        getPopupContainer={(triggerNode) => triggerNode.parentElement}
      />
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => openUserModal()}>
          添加
        </Button>
        <Button icon={<ImportOutlined />} onClick={() => setImportHelpVisible(true)} loading={importLoading} disabled={importLoading}>
          导入
        </Button>
        <Button icon={<ExportOutlined />} onClick={handleExport} loading={exportLoading} disabled={exportLoading}>
          导出{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
        </Button>
        <Button icon={<DeleteOutlined />} onClick={() => setBatchDeleteModalVisible(true)} disabled={selectedRowKeys.length === 0} loading={batchDeleteLoading} danger>
          删除{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
        </Button>
      </Space>
    </Space>
  );

  const renderSearchBar = () => isMobile ? renderMobileSearchBar() : renderDesktopSearchBar();

  const renderMobileCards = () => (
    <List
      style={{ marginTop: '16px', height: 'calc(100vh - 300px)', overflow: 'auto' }}
      grid={{ gutter: 16, xs: 2, sm: 3, md: 4 }}
      dataSource={filteredUsers}
      renderItem={(user) => {
        const isSelected = selectedRowKeys.includes(user.id);
        return (
          <List.Item>
            <Card 
              style={{
                border: `1px solid ${isSelected ? '#1890ff' : '#d9d9d9'}`,
                position: 'relative'
              }}
              styles={{ body: { padding: '12px', textAlign: 'center' } }}
            >
              <Checkbox
                id={`user-card-checkbox-${user.id}`}
                style={{ position: 'absolute', top: '8px', right: '8px' }}
                checked={selectedRowKeys.includes(user.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRowKeys([...selectedRowKeys, user.id]);
                  } else {
                    setSelectedRowKeys(selectedRowKeys.filter(k => k !== user.id));
                  }
                }}
              />
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <UserAvatar avatarPath={user.avatar_path} username={user.username} size={80} />
                <Tooltip title={user.username.length > 8 ? user.username : null}>
                  <Typography.Text ellipsis style={{ width: '80%' }}>
                    {user.username}
                  </Typography.Text>
                </Tooltip>
                <Space size="small">
                  {user.role === 'admin' ? <Tag color="gold">管理员</Tag> : <Tag>普通用户</Tag>}
                  {user.online_devices > 0 ? (
                    <Button size="small" type="link" onClick={() => handleViewDevices(user)}>{user.online_devices}台</Button>
                  ) : (
                    <span>0台</span>
                  )}
                </Space>
                <Button 
                  type="primary"
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => openUserModal(user)}
                  block
                >
                  编辑
                </Button>
              </Space>
            </Card>
          </List.Item>
        );
      }}
    />
  );

  const renderDesktopTable = () => (
    <>
      <Table 
        virtual
        sticky
        scroll={{ x: 500, y: window.innerHeight - 360 }}
        style={{ marginTop: '16px' }}
        columns={getColumns()} 
        dataSource={filteredUsers} 
        rowKey="id" 
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          columnWidth: 36,
          fixed: 'left',
          getCheckboxProps: (record) => ({
            id: `user-checkbox-${record.id}`,
            name: `user-checkbox-${record.id}`
          }),
          selectAllProps: {
            id: 'user-select-all',
            name: 'user-select-all'
          }
        }}
        pagination={false}
      />
      <style>{`
        .ant-table-selection-column {
          text-align: center !important;
        }
        .ant-table-tbody > tr > td.ant-table-selection-column {
          text-align: center !important;
          vertical-align: middle !important;
        }
        .ant-table-selection-column .ant-checkbox-wrapper {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          margin: 0 !important;
        }
        .ant-table-selection-column .ant-checkbox {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
        }
        .ant-table-thead .ant-table-selection-column .ant-checkbox-wrapper {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          height: 100% !important;
          margin: 0 !important;
        }
        .ant-table-tbody > tr {
          height: 76px !important;
        }
        .ant-table-tbody > tr > td {
          vertical-align: middle !important;
        }
      `}</style>
    </>
  );

  return (
    <>
      <input
        id="user-import-input"
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card 
        style={{ borderRadius: '8px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}
        styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
      >
        {renderSearchBar()}
        {isMobile ? renderMobileCards() : renderDesktopTable()}
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px' }}>
          共 {filteredUsers.length} 个用户
        </div>
      </Card>
      
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onCancel={closeUserModal}
        footer={null}
        width={isMobile ? '95%' : 600}
      >
        <Spin spinning={userLoading} tip={editingUser ? '更新中...' : '添加中...'}>
        <Form form={modalForm} layout="vertical" onFinish={handleSubmitUser}>
          <Form.Item 
            name="username" 
            label="用户名" 
            rules={[
              { required: true, message: '请输入用户名' },
              { max: 50, message: '用户名不能超过50个字符' }
            ]}
          >
            <Input 
              id="user-username"
              placeholder="用户名" 
              allowClear 
              maxLength={50}
            />
          </Form.Item>
          <Form.Item 
            name="password" 
            label={editingUser ? '新密码' : '密码'} 
            rules={editingUser ? [
              { max: 100, message: '密码不能超过100个字符' }
            ] : [
              { required: true, message: '请输入密码' },
              { max: 100, message: '密码不能超过100个字符' }
            ]}
          >
            <Input.Password 
              id="user-password"
              placeholder={editingUser ? '不修改密码请留空' : '密码'} 
              allowClear 
              maxLength={100}
            />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select id="user-role" placeholder="选择角色" allowClear>
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="头像">
            <ImageUpload 
              fileList={modalAvatarFileList}
              onChange={({ fileList }) => setModalAvatarFileList(fileList)}
              text="上传头像"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeUserModal} disabled={userLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={userLoading} disabled={userLoading}>
                {editingUser ? '保存' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>
      
      <Modal
        title="删除用户"
        open={batchDeleteModalVisible}
        onOk={handleBatchDelete}
        onCancel={() => setBatchDeleteModalVisible(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: batchDeleteLoading }}
        cancelButtonProps={{ disabled: batchDeleteLoading }}
      >
        <Spin spinning={batchDeleteLoading} tip="删除中...">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Text>确定要删除以下 {selectedRowKeys.length} 个用户吗？</Typography.Text>
          <Space direction="vertical" size="middle" style={{ maxHeight: '200px', overflow: 'auto', width: '100%' }}>
            {selectedRowKeys.map(id => {
              const user = users.find(u => u.id === id);
              return user ? (
                <Typography.Text key={id}>
                  <strong>{user.username}</strong> ({user.role === 'admin' ? '管理员' : '普通用户'})
                </Typography.Text>
              ) : null;
            })}
          </Space>
          <Typography.Text type="danger">⚠️ 此操作不可撤销，请谨慎操作！</Typography.Text>
        </Space>
        </Spin>
      </Modal>
      
      <Modal
        title={`${selectedUser?.username} 的在线设备`}
        open={devicesModalVisible}
        onCancel={() => {
          setDevicesModalVisible(false);
          setSelectedUser(null);
        }}
        footer={null}
        width={isMobile ? '95%' : 600}
      >
        {selectedUser && selectedUser.sessions && selectedUser.sessions.length > 0 ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text>当前用户在 {selectedUser.sessions.length} 台设备上登录</Typography.Text>
            {selectedUser.sessions.map((session) => (
              <Card key={session.session_id} size="small">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Typography.Text>{session.device_info}</Typography.Text>
                  <Typography.Text>登录时间: {new Date(session.login_time * 1000).toLocaleString('zh-CN')}</Typography.Text>
                  <Typography.Text>会话 ID: {session.session_id.substring(0, 8)}...</Typography.Text>
                  <Button 
                    size="small" 
                    danger
                    onClick={() => handleRemoveDevice(session.session_id)}
                  >
                    移除
                  </Button>
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '40px' }}>
            该用户当前没有在线设备
          </Typography.Text>
        )}
      </Modal>
      
      <Modal
        title="用户导入说明"
        open={importHelpVisible}
        onCancel={() => setImportHelpVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportHelpVisible(false)}>
            取消
          </Button>,
          <Button key="download" type="primary" onClick={() => {
            api.downloadUserImportTemplate();
            setImportHelpVisible(false);
          }}>
            下载模板
          </Button>,
          <Button key="import" type="primary" onClick={() => {
            document.getElementById('user-import-input').click();
            setImportHelpVisible(false);
          }}>
            选择文件导入
          </Button>
        ]}
        width={isMobile ? '95%' : 600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={5}>导入格式说明：</Typography.Title>
            <Typography.Paragraph>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>用户名：</strong>必填，不能重复，最多50个字符</li>
                <li><strong>密码：</strong>可选，默认为"password"，最多100个字符</li>
                <li><strong>角色：</strong>可选，只能是"admin"或"user"，默认为"user"</li>
              </ul>
            </Typography.Paragraph>
          </div>
          
          <div>
            <Typography.Title level={5}>导入步骤：</Typography.Title>
            <Typography.Paragraph>
              <ol style={{ paddingLeft: '20px' }}>
                <li>点击“下载模板”获取Excel模板文件</li>
                <li>在模板中填入用户数据（可参考模板中的示例）</li>
                <li>保存Excel文件</li>
                <li>点击“选择文件导入”上传文件</li>
              </ol>
            </Typography.Paragraph>
          </div>
          
          <div>
            <Typography.Title level={5}>注意事项：</Typography.Title>
            <Typography.Paragraph>
              <ul style={{ paddingLeft: '20px' }}>
                <li>如果用户名已存在，将更新该用户的信息</li>
                <li>导入不支持头像，请在导入后手动上传用户头像</li>
                <li>支持.xlsx和.xls格式的Excel文件</li>
              </ul>
            </Typography.Paragraph>
          </div>
        </Space>
      </Modal>
      
      <Modal
        title="导入结果"
        open={importResultVisible}
        onCancel={() => {
          setImportResultVisible(false);
          setImportResult(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setImportResultVisible(false);
            setImportResult(null);
          }}>
            关闭
          </Button>
        ]}
        width={isMobile ? '95%' : 500}
      >
        {importResult && (
          <Result
            status={importResult.success ? 'success' : 'error'}
            title={importResult.success ? '导入成功' : '导入失败'}
            subTitle={
              importResult.success ? (
                <Space direction="vertical" size="small">
                  <div>共处理 {importResult.total_count} 个用户</div>
                  <div>新增 {importResult.created_count} 个，更新 {importResult.updated_count} 个</div>
                  <div style={{ color: '#faad14', fontSize: '12px' }}>
                    注意：导入不支持头像，请手动上传用户头像
                  </div>
                </Space>
              ) : (
                <div style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                  {importResult.message}
                </div>
              )
            }
          />
        )}
      </Modal>
      </Space>
    </>
  );
};

export default User;