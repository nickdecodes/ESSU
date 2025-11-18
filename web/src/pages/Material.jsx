import { AppstoreOutlined, BarChartOutlined, DeleteOutlined, DownOutlined, EditOutlined, ExportOutlined, EyeOutlined, ImportOutlined, PictureOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons';
import { App, Button, Card, Checkbox, Col, Form, Image, Input, InputNumber, Modal, Result, Row, Select, Space, Spin, Statistic, Table, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import { api } from '../utils/api';
import { Config } from '../utils/config';
import { useResponsive } from '../utils/device';
import { useMaterials } from '../utils/hooks';

const Material = ({ user }) => {
  const { message } = App.useApp();
  const { isMobile } = useResponsive();
  const { materials, filteredMaterials, setFilteredMaterials, loading, loadMaterials, pagination, setPagination } = useMaterials();
  
  const [addForm] = Form.useForm();
  const [inForm] = Form.useForm();
  const [outForm] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleteModalVisible, setBatchDeleteModalVisible] = useState(false);
  const [searchKeywords, setSearchKeywords] = useState(() => JSON.parse(localStorage.getItem('material_searchKeywords') || '[]'));
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileList, setFileList] = useState([]);
  const [editFileList, setEditFileList] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [inLoading, setInLoading] = useState(false);
  const [outLoading, setOutLoading] = useState(false);
  const [priceConfirmModalVisible, setPriceConfirmModalVisible] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState(null);
  const [affectedProducts, setAffectedProducts] = useState([]);
  const [stockFilter, setStockFilter] = useState(() => localStorage.getItem('material_stockFilter') || null);
  const [referenceFilter, setReferenceFilter] = useState(() => localStorage.getItem('material_referenceFilter') || null);
  const [sortInfo, setSortInfo] = useState(null);
  const [statsCollapsed, setStatsCollapsed] = useState(() => {
    const saved = localStorage.getItem('material_statsCollapsed');
    return saved === 'true';
  });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [inModalVisible, setInModalVisible] = useState(false);
  const [outModalVisible, setOutModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [importHelpVisible, setImportHelpVisible] = useState(false);
  const [importResultVisible, setImportResultVisible] = useState(false);
  const [importResult, setImportResult] = useState(null);
  
  const totalStock = (materials || []).reduce((sum, material) => sum + (material.stock_count || 0), 0);
  const totalValue = (materials || []).reduce((sum, material) => sum + ((material.out_price || 0) * (material.stock_count || 0)), 0);
  
  const CELL_HEIGHT = 60;

  useEffect(() => {
    localStorage.setItem('material_searchKeywords', JSON.stringify(searchKeywords));
  }, [searchKeywords]);

  useEffect(() => {
    stockFilter ? localStorage.setItem('material_stockFilter', stockFilter) : localStorage.removeItem('material_stockFilter');
  }, [stockFilter]);

  useEffect(() => {
    referenceFilter ? localStorage.setItem('material_referenceFilter', referenceFilter) : localStorage.removeItem('material_referenceFilter');
  }, [referenceFilter]);

  const handleEdit = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({ name: record.name, in_price: record.in_price, out_price: record.out_price });
    setEditFileList(record.image_path ? [{ uid: '-1', name: 'image.jpg', status: 'done', url: `http://localhost:5274/${record.image_path}` }] : []);
    setEditModalVisible(true);
  };

  const handleEditSave = async (values) => {
    if (editLoading) return;
    setEditLoading(true);
    try {
      const checkResponse = await api.checkRelatedProducts(editingRecord.id, {
        in_price: values.in_price,
        out_price: values.out_price
      });
      
      if (checkResponse.data.success && checkResponse.data.price_changed && checkResponse.data.affected_products.length > 0) {
        setAffectedProducts(checkResponse.data.affected_products);
        setPendingUpdateData(values);
        setPriceConfirmModalVisible(true);
        setEditLoading(false);
        return;
      }
      
      await performUpdate(values);
      
    } catch (error) {
      message.error('材料更新失败');
      setEditLoading(false);
    }
  };
  
  const performUpdate = async (values) => {
    try {
      const image_path = editFileList[0]?.response?.image_path || (editFileList[0]?.url ? editingRecord.image_path : null);
      const startTime = Date.now();
      const response = await api.updateMaterial(editingRecord.id, { ...values, username: user.username, image_path });
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success('材料更新成功' + (response.data.price_changed ? '，产品价格已自动更新' : ''));
        setPriceConfirmModalVisible(false);
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingRecord(null);
        setEditFileList([]);
        setPendingUpdateData(null);
        setAffectedProducts([]);
        setEditLoading(false);
        loadMaterials(message.error);
      } else {
        message.error(response.data.message || '材料更新失败');
        setEditLoading(false);
      }
    } catch (error) {
      message.error('材料更新失败');
      setEditLoading(false);
    }
  };
  
  const handlePriceConfirm = async () => {
    setEditLoading(true);
    await performUpdate(pendingUpdateData);
    setPriceConfirmModalVisible(false);
    setPendingUpdateData(null);
    setAffectedProducts([]);
  };

  const handleBatchDelete = async () => {
    if (batchDeleteLoading) return;
    setBatchDeleteLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.batchDeleteMaterials(selectedRowKeys, user.username);
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success(response.data.message || `成功删除 ${selectedRowKeys.length} 个材料`);
        setBatchDeleteModalVisible(false);
        setSelectedRowKeys([]);
        setBatchDeleteLoading(false);
        loadMaterials(message.error);
      } else {
        // 显示错误信息，但如果有删除成功的材料，仍然关闭弹窗并刷新
        Modal.error({
          title: '批量删除结果',
          content: (
            <div>
              {response.data.deleted_count > 0 && (
                <div style={{ 
                  background: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: '6px', 
                  padding: '12px', 
                  marginBottom: '12px' 
                }}>
                  <span style={{ color: '#52c41a' }}>✓ 成功删除 {response.data.deleted_count} 个材料</span>
                </div>
              )}
              {response.data.failed_materials && response.data.failed_materials.length > 0 && (
                <div>
                  <p style={{ marginBottom: '8px', fontWeight: '500' }}>失败的材料：</p>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '6px' 
                  }}>
                    {response.data.failed_materials.map((item, index) => (
                      <div key={index} style={{ 
                        padding: '8px 12px', 
                        borderBottom: index < response.data.failed_materials.length - 1 ? '1px solid #f0f0f0' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontWeight: '500' }}>{item.name}</span>
                        <span style={{ color: '#ff4d4f', fontSize: '12px' }}>{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
          width: 600
        });
        if (response.data.should_close) {
          setBatchDeleteModalVisible(false);
          setSelectedRowKeys([]);
          setBatchDeleteLoading(false);
          loadMaterials(message.error);
        } else {
          setBatchDeleteLoading(false);
        }
      }
    } catch (error) {
      message.error('批量删除失败');
      setBatchDeleteLoading(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    columnWidth: 36,
    fixed: 'left',
    getCheckboxProps: (record) => ({ id: `material-checkbox-${record.id}`, name: `material-checkbox-${record.id}` }),
    selectAllProps: { id: 'material-select-all', name: 'material-select-all' }
  };

  const handleSearchChange = setSearchKeywords;

  const getFilteredMaterials = () => (filteredMaterials || []).filter(material => {
    if (searchKeywords.length > 0 && !searchKeywords.includes(material.name)) return false;
    if (stockFilter === 'zero' && material.stock_count > 0) return false;
    if (stockFilter === 'low' && material.stock_count > 5) return false;
    if (stockFilter === 'normal' && material.stock_count <= 5) return false;
    if (referenceFilter === 'zero' && (material.used_by_products || 0) > 0) return false;
    if (referenceFilter === 'used' && (material.used_by_products || 0) === 0) return false;
    return true;
  });
  const uploadFormData = async (endpoint, data, file, fieldName) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));
    formData.append(fieldName, file);
    const res = await fetch(`${Config.API_BASE_URL}${endpoint}`, { method: 'POST', body: formData });
    return { data: await res.json() };
  };

  const addMaterial = async (values) => {
    setAddLoading(true);
    try {
      const startTime = Date.now();
      const hasFile = fileList?.length > 0 && fileList[0].originFileObj;
      const response = hasFile
        ? await uploadFormData('/materials', {...values, username: user.username, out_price: values.out_price || values.in_price}, fileList[0].originFileObj, 'image')
        : await api.addMaterial({...values, username: user.username});
      
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success('材料添加成功');
        setAddModalVisible(false);
        addForm.resetFields();
        setFileList([]);
        setAddLoading(false);
        loadMaterials(message.error);
      } else {
        message.error(response.data.message || '材料添加失败');
        setAddLoading(false);
      }
    } catch (error) {
      console.error('材料添加失败:', error);
      message.error('材料添加失败');
      setAddLoading(false);
    }
  };

  const inbound = async (values) => {
    if (inLoading) return;
    setInLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.materialIn({...values, username: user.username});
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success('入库成功');
        setInModalVisible(false);
        inForm.resetFields();
        setSelectedMaterial(null);
        setInLoading(false);
        loadMaterials(message.error);
      } else {
        message.error(response.data.message || '入库失败');
        setInLoading(false);
      }
    } catch (error) {
      console.error('入库失败', error);
      message.error('入库失败');
      setInLoading(false);
    }
  };

  const outbound = async (values) => {
    if (outLoading) return;
    setOutLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.materialOut({...values, username: user.username});
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success('出库成功');
        setOutModalVisible(false);
        outForm.resetFields();
        setSelectedMaterial(null);
        setOutLoading(false);
        loadMaterials(message.error);
      } else {
        message.error(response.data.message || '出库失败');
        setOutLoading(false);
      }
    } catch (error) {
      console.error('出库失败', error);
      message.error('出库失败');
      setOutLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadMaterials(message.error);
  }, [user]);

  useEffect(() => {
    setFilteredMaterials(materials);
  }, [materials]);

  const handleImageUpload = ({ fileList }) => setFileList(fileList);
  const handleEditImageUpload = ({ fileList }) => setEditFileList(fileList);
  const handlePreview = (file) => {
    setPreviewImage(file.url || file.response?.url);
    setImagePreviewVisible(true);
  };

  const uploadProps = {
    name: 'image',
    action: 'http://localhost:5274/upload/image',
    listType: 'picture-card',
    fileList,
    onChange: handleImageUpload,
    onPreview: handlePreview,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
      }
      const isLt16M = file.size / 1024 / 1024 < 16;
      if (!isLt16M) {
        message.error('图片大小不能超过16MB!');
      }
      return isImage && isLt16M;
    },
  };

  const editUploadProps = {
    name: 'image',
    action: 'http://localhost:5274/upload/image',
    listType: 'picture-card',
    fileList: editFileList,
    onChange: handleEditImageUpload,
    onPreview: handlePreview,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
      }
      const isLt16M = file.size / 1024 / 1024 < 16;
      if (!isLt16M) {
        message.error('图片大小不能超过16MB!');
      }
      return isImage && isLt16M;
    },
  };

  const renderMobileCards = () => (
    <>
      <div  style={{ marginTop: '16px', height: 'calc(100vh - 320px)', overflow: 'auto' }}>
        {getFilteredMaterials().map((material) => {
          const isSelected = selectedRowKeys.includes(material.id);
          return (
            <Card
              key={material.id}
              style={{
                marginBottom: '12px',
                border: `1px solid ${isSelected ? '#1890ff' : '#d9d9d9'}`,
                position: 'relative'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              {user.role === 'admin' && (
                <Checkbox
                  id={`material-card-checkbox-${material.id}`}
                  style={{ position: 'absolute', top: '12px', right: '12px' }}
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRowKeys([...selectedRowKeys, material.id]);
                    } else {
                      setSelectedRowKeys(selectedRowKeys.filter(k => k !== material.id));
                    }
                  }}
                />
              )}
              <Tooltip title={material.name.length > 10 ? material.name : null}>
                <Typography.Text ellipsis style={{ width: '80%', fontWeight: '600', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                  {material.name}
                </Typography.Text>
              </Tooltip>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: material.image_path ? 'transparent' : '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {material.image_path ? (
                    <Image
                      width={80}
                      height={80}
                      src={`http://localhost:5274/${material.image_path}`}
                      style={{ borderRadius: '8px', objectFit: 'cover' }}
                      preview={{
                        mask: <EyeOutlined style={{ fontSize: '20px' }} />
                      }}
                    />
                  ) : (
                    <PictureOutlined style={{ color: '#ccc', fontSize: '32px' }} />
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                  <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    进价: <span style={{ fontWeight: '600' }}>¥{(material.in_price || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    售价: <span style={{ fontWeight: '600' }}>¥{(material.out_price || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    库存: <span style={{ 
                      fontWeight: '600',
                      color: material.stock_count > 10 ? '#52c41a' : material.stock_count > 0 ? '#faad14' : '#ff4d4f'
                    }}>
                      {material.stock_count}
                    </span>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '60px' }}>
                    <Button 
                      type="primary"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(material)}
                      style={{ padding: '4px 8px' }}
                    >
                      编辑
                    </Button>
                    <Button 
                      size="small"
                      icon={<ImportOutlined />}
                      onClick={() => {
                        setSelectedMaterial(material);
                        setInModalVisible(true);
                      }}
                      style={{ padding: '4px 8px', color: '#1890ff', borderColor: '#1890ff' }}
                    >
                      入库
                    </Button>
                    <Button 
                      size="small"
                      icon={<ExportOutlined />}
                      onClick={() => {
                        setSelectedMaterial(material);
                        setOutModalVisible(true);
                      }}
                      style={{ padding: '4px 8px', color: '#faad14', borderColor: '#faad14' }}
                    >
                      出库
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );

  const renderDesktopTable = () => (
    <>
      <Table 
        virtual
        sticky
        scroll={{ x: 1000, y: window.innerHeight - 320 }}
        columns={getColumns()}
        dataSource={getFilteredMaterials()} 
        rowKey="id"
        loading={loading}
        rowSelection={user.role === 'admin' ? rowSelection : undefined}
        pagination={false}
        style={{ 
          marginTop: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      />
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px' }}>
        共 {getFilteredMaterials().length} 个材料
      </div>
    </>
  );

  const getColumns = () => [
    {
      title: '图片',
      dataIndex: 'image_path',
      key: 'image_path',
      width: 80,
      align: 'center',
      render: (imagePath) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: imagePath ? 'transparent' : '#f5f5f5'
          }}>
            {imagePath ? (
              <Image
                width={50}
                height={50}
                src={`http://localhost:5274/${imagePath}`}
                style={{ borderRadius: '6px', objectFit: 'cover' }}
                preview={{
                  mask: <EyeOutlined style={{ fontSize: '16px' }} />
                }}
              />
            ) : (
              <PictureOutlined style={{ color: '#ccc', fontSize: '20px' }} />
            )}
          </div>
        </div>
      )
    },
    { 
      title: '名称', 
      dataIndex: 'name', 
      key: 'name',
      width: isMobile ? 100 : 150,
      render: (text) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center' }}>
          <Tooltip title={text.length > (isMobile ? 8 : 12) ? text : null}>
            <span style={{ 
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: isMobile ? '100px' : '150px'
            }}>
              {text}
            </span>
          </Tooltip>
        </div>
      )
    },
    { 
      title: '进价', 
      dataIndex: 'in_price', 
      key: 'in_price',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.in_price || 0) - (b.in_price || 0),
      render: (price) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ¥{(price || 0).toFixed(2)}
        </div>
      )
    },
    { 
      title: '售价', 
      dataIndex: 'out_price', 
      key: 'out_price',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.out_price || 0) - (b.out_price || 0),
      render: (price) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ¥{(price || 0).toFixed(2)}
        </div>
      )
    },
    { 
      title: '库存', 
      dataIndex: 'stock_count', 
      key: 'stock_count',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.stock_count || 0) - (b.stock_count || 0),
      render: (stock) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ 
            color: stock > 10 ? '#52c41a' : stock > 0 ? '#faad14' : '#ff4d4f',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '12px',
            background: stock > 10 ? 'rgba(76, 175, 80, 0.1)' : stock > 0 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)'
          }}>
            {stock}
          </span>
        </div>
      )
    },
    ...(user.role === 'admin' ? [{
      title: '操作',
      key: 'action',
      width: isMobile ? 120 : 140,
      align: 'center',
      render: (_, record) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '120px' }}>
            <Button 
              size="small" 
              type="primary"
              ghost
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ padding: '4px 8px' }}
            >
              {isMobile ? '' : '编辑'}
            </Button>
            <Button 
              size="small" 
              icon={<ImportOutlined />}
              onClick={() => {
                setSelectedMaterial(record);
                setInModalVisible(true);
              }}
              style={{ padding: '4px 8px', color: '#1890ff', borderColor: '#1890ff' }}
            >
              {isMobile ? '' : '入库'}
            </Button>
            <Button 
              size="small" 
              icon={<ExportOutlined />}
              onClick={() => {
                setSelectedMaterial(record);
                setOutModalVisible(true);
              }}
              style={{ padding: '4px 8px', color: '#faad14', borderColor: '#faad14', gridColumn: '1 / -1' }}
            >
              {isMobile ? '' : '出库'}
            </Button>
          </div>
        </div>
      )
    }] : [])
  ];

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', user.username);
    
    try {
      const startTime = Date.now();
      const response = await api.importMaterials(formData);
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      setImportResult(response.data);
      setImportResultVisible(true);
      
      if (response.data.success) {
        loadMaterials();
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
    const materials = selectedRowKeys.length > 0 
      ? selectedRowKeys 
      : getFilteredMaterials().map(m => m.id);
    
    if (materials.length > 1000) {
      Modal.warning({
        title: '导出数量过多',
        content: `当前选择了 ${materials.length} 个材料，数据量过大。请使用筛选功能减少导出数量（建议不超过1000个）。`
      });
      return;
    }
    
    setExportLoading(true);
    try {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const materialIds = materials.join(',');
      api.exportMaterials(materialIds, user.username);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <input
        id="material-import-input"
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <div key={isMobile ? 'mobile-stats' : 'desktop-stats'} style={{ marginBottom: '16px' }}>
        {isMobile ? (
          <Card 
            styles={{ body: { padding: '8px 12px' } }}
          >
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => {
                const newValue = !statsCollapsed;
                setStatsCollapsed(newValue);
                localStorage.setItem('material_statsCollapsed', newValue);
              }}
            >
              <span style={{ fontWeight: '600', fontSize: '13px' }}>数据概览</span>
              {statsCollapsed ? <DownOutlined style={{ fontSize: '10px' }} /> : <UpOutlined style={{ fontSize: '10px' }} />}
            </div>
            {!statsCollapsed && (
              <Space direction="vertical" size="small" style={{ width: '100%', marginTop: '12px' }}>
                <Card style={{ marginBottom: '8px' }} styles={{ body: { padding: '12px' } }}>
                  <Statistic 
                    title="材料种类" 
                    value={materials ? materials.length : 0} 
                    prefix={<AppstoreOutlined style={{ color: '#1890ff', fontSize: '16px' }} />}
                    valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    style={{ fontSize: '12px' }}
                  />
                </Card>
                <Card style={{ marginBottom: '8px' }} styles={{ body: { padding: '12px' } }}>
                  <Statistic 
                    title="材料总数量" 
                    value={totalStock} 
                    prefix={<BarChartOutlined style={{ color: '#52c41a', fontSize: '16px' }} />}
                    valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                    style={{ fontSize: '12px' }}
                  />
                </Card>
                <Card style={{ marginBottom: '0px' }} styles={{ body: { padding: '12px' } }}>
                  <Statistic 
                    title="材料总价值" 
                    value={totalValue} 
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#faad14', fontSize: '20px' }}
                    style={{ fontSize: '12px' }}
                  />
                </Card>
              </Space>
            )}
          </Card>
        ) : (
          <Row gutter={16}>
            <Col flex={1}>
              <Card>
                <Statistic 
                  title="材料种类" 
                  value={materials ? materials.length : 0} 
                  prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col flex={1}>
              <Card>
                <Statistic 
                  title="材料总数量" 
                  value={totalStock} 
                  prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col flex={1}>
              <Card>
                <Statistic 
                  title="材料总价值" 
                  value={totalValue} 
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>

      <Card 
        style={{ borderRadius: '8px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}
        styles={{ body: { padding: isMobile ? '16px' : '24px' } }}
      >
        {isMobile ? (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Select
                  mode="multiple"
                  value={searchKeywords}
                  onChange={handleSearchChange}
                  placeholder="搜索材料"
                  style={{ width: '100%' }}
                  allowClear
                showSearch
                optionLabelProp="label"
                filterOption={(input, option) => {
                  const material = materials.find(m => m.name === option.value);
                  return material && material.name.toLowerCase().includes(input.toLowerCase());
                }}
                maxTagCount="responsive"
                getPopupContainer={(triggerNode) => triggerNode.parentElement}
              >
                {(materials || []).map((material, index) => (
                  <Select.Option 
                    key={`search-${material.id}-${index}`} 
                    value={material.name}
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {material.image_path ? (
                          <img 
                            src={`http://localhost:5274/${material.image_path}`} 
                            alt=""
                            style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '20px', height: '20px', background: '#f5f5f5', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <PictureOutlined style={{ color: '#ccc', fontSize: '10px' }} />
                          </div>
                        )}
                        <span>{material.name}</span>
                      </div>
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {material.image_path ? (
                        <img 
                          src={`http://localhost:5274/${material.image_path}`} 
                          alt=""
                          style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '24px', height: '24px', background: '#f5f5f5', borderRadius: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <PictureOutlined style={{ color: '#ccc', fontSize: '12px' }} />
                        </div>
                      )}
                      <div>
                        <div>{material.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          库存: {material.stock_count}
                        </div>
                      </div>
                    </div>
                  </Select.Option>
                ))}
                </Select>
              </Col>
              {user.role === 'admin' && (
                <>
                  <Col span={12}>
                    <Select
                      placeholder="库存筛选"
                      value={stockFilter}
                      onChange={setStockFilter}
                      allowClear
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="zero">库存=0</Select.Option>
                      <Select.Option value="low">库存≤5</Select.Option>
                      <Select.Option value="normal">库存&gt;5</Select.Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Select
                      placeholder="引用筛选"
                      value={referenceFilter}
                      onChange={setReferenceFilter}
                      allowClear
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="zero">无产品引用</Select.Option>
                      <Select.Option value="used">有产品引用</Select.Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Button 
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setAddModalVisible(true)}
                      block
                    >
                      添加
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button 
                      icon={<ImportOutlined />}
                      onClick={() => setImportHelpVisible(true)}
                      loading={importLoading}
                      disabled={importLoading}
                      block
                    >
                      导入
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button 
                      icon={<ExportOutlined />}
                      onClick={handleExport}
                      loading={exportLoading}
                      disabled={exportLoading}
                      block
                    >
                      导出{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button 
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setBatchDeleteModalVisible(true)}
                      disabled={selectedRowKeys.length === 0}
                      loading={batchDeleteLoading}
                      block
                    >
                      删除{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
                    </Button>
                  </Col>
                </>
              )}
            </Row>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Select
                  mode="multiple"
                  value={searchKeywords}
                  onChange={handleSearchChange}
                  placeholder="选择材料进行搜索"
                  style={{ flex: 1 }}
                  allowClear
                  showSearch
                  optionLabelProp="label"
                  filterOption={(input, option) => {
                    const material = materials.find(m => m.name === option.value);
                    return material && material.name.toLowerCase().includes(input.toLowerCase());
                  }}
                  maxTagCount="responsive"
                  getPopupContainer={(triggerNode) => triggerNode.parentElement}
                >
                  {(materials || []).map((material, index) => (
                    <Select.Option 
                      key={`search-${material.id}-${index}`} 
                      value={material.name}
                      label={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {material.image_path ? (
                            <img 
                              src={`http://localhost:5274/${material.image_path}`} 
                              alt=""
                              style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '20px', height: '20px', background: '#f5f5f5', borderRadius: '4px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <PictureOutlined style={{ color: '#ccc', fontSize: '10px' }} />
                            </div>
                          )}
                          <span>{material.name}</span>
                        </div>
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {material.image_path ? (
                          <img 
                            src={`http://localhost:5274/${material.image_path}`} 
                            alt=""
                            style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '24px', height: '24px', background: '#f5f5f5', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <PictureOutlined style={{ color: '#ccc', fontSize: '12px' }} />
                          </div>
                        )}
                        <div>
                          <div>{material.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            库存: {material.stock_count}
                          </div>
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
                {user?.role === 'admin' && (
                  <>
                    <Select
                      placeholder="库存筛选"
                      value={stockFilter}
                      onChange={setStockFilter}
                      allowClear
                      style={{ width: 120 }}
                    >
                      <Select.Option value="zero">库存=0</Select.Option>
                      <Select.Option value="low">库存≤5</Select.Option>
                      <Select.Option value="normal">库存&gt;5</Select.Option>
                    </Select>
                    <Select
                      placeholder="引用筛选"
                      value={referenceFilter}
                      onChange={setReferenceFilter}
                      allowClear
                      style={{ width: 120 }}
                    >
                      <Select.Option value="zero">无产品引用</Select.Option>
                      <Select.Option value="used">有产品引用</Select.Option>
                    </Select>
                  </>
                )}
              </div>
              {user.role === 'admin' && (
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button 
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalVisible(true)}
                  >
                    添加
                  </Button>
                  <Button 
                    icon={<ImportOutlined />}
                    onClick={() => setImportHelpVisible(true)}
                    loading={importLoading}
                    disabled={importLoading}
                  >
                    导入
                  </Button>
                  <Button 
                    icon={<ExportOutlined />}
                    onClick={handleExport}
                    loading={exportLoading}
                    disabled={exportLoading}
                  >
                    导出{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
                  </Button>
                  <Button 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setBatchDeleteModalVisible(true)}
                    disabled={selectedRowKeys.length === 0}
                    loading={batchDeleteLoading}
                  >
                    删除{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
                  </Button>
                </Space>
              )}
            </Space>
          )}
        {isMobile ? renderMobileCards() : renderDesktopTable()}
      </Card>
      
      <Modal
        title="材料入库"
        open={inModalVisible}
        onCancel={() => {
          setInModalVisible(false);
          inForm.resetFields();
          setSelectedMaterial(null);
        }}
        footer={null}
        width={isMobile ? '95%' : 450}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Spin spinning={inLoading} tip="入库中...">
        <Form form={inForm} layout="vertical" onFinish={(values) => {
          inbound({ ...values, material_id: selectedMaterial.id });
        }}>
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedMaterial?.image_path ? (
                <img 
                  src={`http://localhost:5274/${selectedMaterial.image_path}`} 
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PictureOutlined style={{ color: '#ccc' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={selectedMaterial?.name?.length > 15 ? selectedMaterial?.name : null}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMaterial?.name}</div>
                </Tooltip>
                <div style={{ fontSize: 12 }}>当前库存：{selectedMaterial?.stock_count}</div>
              </div>
            </div>
          </div>
          <Form.Item name="quantity" label="入库数量" rules={[
            { required: true, message: '请输入入库数量' },
            { type: 'number', min: 1, max: 999999, message: '数量必须在1-999999之间' }
          ]}>
            <InputNumber id="material-in-quantity" placeholder="入库数量" min={1} max={999999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="supplier" label="供应商" initialValue={user.username} rules={[
            { max: 100, message: '供应商名称不能超过100个字符' }
          ]}>
            <Input id="material-in-supplier" placeholder="供应商（可选）" allowClear maxLength={100} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setInModalVisible(false);
                inForm.resetFields();
                setSelectedMaterial(null);
              }} disabled={inLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={inLoading} disabled={inLoading} style={{ borderRadius: '6px' }}>
                入库
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>
      
      <Modal
        title="材料出库"
        open={outModalVisible}
        onCancel={() => {
          setOutModalVisible(false);
          outForm.resetFields();
          setSelectedMaterial(null);
        }}
        footer={null}
        width={isMobile ? '95%' : 450}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Spin spinning={outLoading} tip="出库中...">
        <Form form={outForm} layout="vertical" onFinish={(values) => {
          outbound({ ...values, material_id: selectedMaterial.id });
        }}>
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedMaterial?.image_path ? (
                <img 
                  src={`http://localhost:5274/${selectedMaterial.image_path}`} 
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PictureOutlined style={{ color: '#ccc' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={selectedMaterial?.name?.length > 15 ? selectedMaterial?.name : null}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMaterial?.name}</div>
                </Tooltip>
                <div style={{ fontSize: 12 }}>当前库存：{selectedMaterial?.stock_count}</div>
              </div>
            </div>
          </div>
          <Form.Item name="quantity" label="出库数量" rules={[
            { required: true, message: '请输入出库数量' },
            { type: 'number', min: 1, max: 999999, message: '数量必须在1-999999之间' }
          ]}>
            <InputNumber id="material-out-quantity" placeholder="出库数量" min={1} max={999999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="出库价格" initialValue={selectedMaterial?.out_price} rules={[
            { required: true, message: '请输入出库价格' },
            { type: 'number', min: 0, message: '价格必须大于等于0' }
          ]}>
            <InputNumber id="material-out-price" placeholder="出库价格" min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="customer" label="客户" initialValue={user.username} rules={[
            { max: 100, message: '客户名称不能超过100个字符' }
          ]}>
            <Input id="material-out-customer" placeholder="客户（可选）" allowClear maxLength={100} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setOutModalVisible(false);
                outForm.resetFields();
                setSelectedMaterial(null);
              }} disabled={outLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={outLoading} disabled={outLoading} style={{ borderRadius: '6px' }}>
                出库
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>
      
      <Modal
        title="添加材料"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          addForm.resetFields();
          setFileList([]);
        }}
        footer={null}
        width={isMobile ? '95%' : 600}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Spin spinning={addLoading} tip="添加中...">
        <Form form={addForm} layout="vertical" onFinish={(values) => {
          addMaterial(values);
        }}>
          <Form.Item 
            name="name" 
            label="材料名称"
            rules={[
              { required: true, message: '请输入材料名称' },
              { max: 100, message: '材料名称不能超过100个字符' }
            ]}
          >
            <Input 
              id="material-name"
              placeholder="请输入材料名称（如：红玛瑙珠子）" 
              allowClear 
              maxLength={100}
              showCount
              prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="in_price" 
                label="进价"
                rules={[{ required: true, message: '请输入进价' }]}
              >
                <InputNumber 
                  id="material-in-price"
                  placeholder="0.00" 
                  min={0} 
                  step={0.01} 
                  style={{ width: '100%' }}
                  prefix="¥"
                  onChange={(value) => {
                    const currentPrice = addForm.getFieldValue('out_price');
                    if (!currentPrice && value) {
                      addForm.setFieldsValue({ out_price: value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="out_price" label="售价">
                <InputNumber 
                  id="material-out-price"
                  placeholder="默认为进价" 
                  min={0} 
                  step={0.01} 
                  style={{ width: '100%' }}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="image" label="材料图片">
            <ImageUpload 
              fileList={fileList}
              onChange={handleImageUpload}
              text="上传图片"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                addForm.resetFields();
                setFileList([]);
              }}>
                清空
              </Button>
              <Button type="primary" htmlType="submit" loading={addLoading} disabled={addLoading} style={{ borderRadius: '6px' }}>
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>
      
      <Modal
        title="编辑材料"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingRecord(null);
        }}
        footer={null}
        width={isMobile ? '95%' : 400}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSave}>

          <Form.Item name="name" label="材料名称" rules={[{ required: true, message: '请输入材料名称' }]}>
            <Input id="material-edit-name" placeholder="材料名称" allowClear />
          </Form.Item>
          <Form.Item name="in_price" label="进价" rules={[{ required: true, message: '请输入进价' }]}>
            <InputNumber id="material-edit-in-price" placeholder="0.00" min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="out_price" label="售价" rules={[{ required: true, message: '请输入售价' }]}>
            <InputNumber id="material-edit-out-price" placeholder="0.00" min={0} step={0.01} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item label="材料图片">
            <ImageUpload 
              fileList={editFileList}
              onChange={handleEditImageUpload}
              text="上传图片"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
                setEditingRecord(null);
                setEditFileList([]);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={editLoading} style={{ borderRadius: '6px' }}>
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      <Modal
        title="批量删除材料"
        open={batchDeleteModalVisible}
        onOk={handleBatchDelete}
        onCancel={() => {
          setBatchDeleteModalVisible(false);
        }}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: batchDeleteLoading }}
        cancelButtonProps={{ disabled: batchDeleteLoading }}
      >
        <Spin spinning={batchDeleteLoading} tip="删除中...">
        <p>确定要删除以下 {selectedRowKeys.length} 个材料吗？</p>
        <div style={{ padding: '12px', borderRadius: '6px', margin: '12px 0', maxHeight: '200px', overflow: 'auto', border: '1px solid #d9d9d9' }}>
          {selectedRowKeys.map(materialId => {
            const material = materials.find(m => m.id === materialId);
            return material ? (
              <div key={materialId} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '8px',
                padding: '4px'
              }}>
                {material.image_path ? (
                  <img 
                    src={`http://localhost:5274/${material.image_path}`} 
                    alt={material.name}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '24px', height: '24px', background: '#fafafa', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <PictureOutlined style={{ color: '#bfbfbf', fontSize: '12px' }} />
                  </div>
                )}
                <strong>{material.name}</strong>
              </div>
            ) : null;
          })}
        </div>
        <p style={{ color: '#ff4d4f', fontSize: '14px' }}>⚠️ 此操作不可撤销，请谨慎操作！</p>
        </Spin>
      </Modal>
      
      <Modal
        open={imagePreviewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setImagePreviewVisible(false)}
        width={600}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
      
      <Modal
        title="价格变动确认"
        open={priceConfirmModalVisible}
        onOk={handlePriceConfirm}
        onCancel={() => {
          setPriceConfirmModalVisible(false);
          setPendingUpdateData(null);
          setAffectedProducts([]);
        }}
        okText="确认"
        cancelText="取消"
        width={700}
        okButtonProps={{ disabled: editLoading }}
        cancelButtonProps={{ disabled: editLoading }}
      >
        <Spin spinning={editLoading} tip="更新中...">
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#faad14', fontWeight: '500', marginBottom: '12px' }}>
            ⚠️ 材料价格变动将会影响以下产品的成本和售价：
          </p>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {affectedProducts.map(product => (
              <div key={product.id} style={{ 
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '4px',
                border: '1px solid #d9d9d9',
                display: 'grid',
                gridTemplateColumns: '60px 1fr',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div>
                  {product.image_path ? (
                    <img 
                      src={`http://localhost:5274/${product.image_path}`} 
                      alt=""
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '4px', 
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '50px', 
                      height: '50px', 
                      background: '#fafafa', 
                      borderRadius: '4px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      <PictureOutlined style={{ color: '#bfbfbf', fontSize: '16px' }} />
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                    材料清单：{product.materials || '无'}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <div>成本：¥{product.current_cost} → ¥{product.new_cost}</div>
                    <div>售价：¥{product.current_selling} → ¥{product.new_selling}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '12px' }}>
            系统将自动更新这些产品的价格，是否继续？
          </p>
        </div>
        </Spin>
      </Modal>
      
      <Modal
        title="材料导入说明"
        open={importHelpVisible}
        onCancel={() => setImportHelpVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportHelpVisible(false)}>
            取消
          </Button>,
          <Button key="download" type="primary" onClick={() => {
            api.downloadMaterialImportTemplate();
            setImportHelpVisible(false);
          }}>
            下载模板
          </Button>,
          <Button key="import" type="primary" onClick={() => {
            document.getElementById('material-import-input').click();
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
                <li><strong>材料名称：</strong>必填，不能重复，最多100个字符</li>
                <li><strong>进价：</strong>必填，数字类型</li>
                <li><strong>售价：</strong>可选，默认为进价，数字类型</li>
                <li><strong>数量：</strong>可选，默认为0，导入后会加到库存中</li>
              </ul>
            </Typography.Paragraph>
          </div>
          
          <div>
            <Typography.Title level={5}>导入步骤：</Typography.Title>
            <Typography.Paragraph>
              <ol style={{ paddingLeft: '20px' }}>
                <li>点击"下载模板"获取Excel模板文件</li>
                <li>在模板中填入材料数据（可参考模板中的示例）</li>
                <li>保存Excel文件</li>
                <li>点击"选择文件导入"上传文件</li>
              </ol>
            </Typography.Paragraph>
          </div>
          
          <div>
            <Typography.Title level={5}>注意事项：</Typography.Title>
            <Typography.Paragraph>
              <ul style={{ paddingLeft: '20px' }}>
                <li>如果材料名称已存在，将更新该材料的信息</li>
                <li>导入不支持图片，请在导入后手动上传材料图片</li>
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
                  <div>共处理 {importResult.total_count} 个材料</div>
                  <div>新增 {importResult.created_count} 个，更新 {importResult.updated_count} 个</div>
                  <div style={{ color: '#faad14', fontSize: '12px' }}>
                    注意：导入不支持图片，请手动上传材料图片
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
    </>
  );
};

export default Material;