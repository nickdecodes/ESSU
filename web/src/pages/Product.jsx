import { AppstoreOutlined, BarChartOutlined, DeleteOutlined, DownOutlined, EditOutlined, ExportOutlined, EyeOutlined, ImportOutlined, PictureOutlined, PlusOutlined, UndoOutlined, UpOutlined } from '@ant-design/icons';
import { App, Button, Card, Checkbox, Col, Flex, Form, Image, Input, InputNumber, Modal, Result, Row, Select, Space, Spin, Statistic, Table, Tooltip, Typography } from 'antd';
import { useEffect, useState } from 'react';
import ImageUpload from '../components/ImageUpload';
import { api } from '../utils/api';
import { Config } from '../utils/config';
import { useResponsive } from '../utils/device';
import { useMaterials, useProducts } from '../utils/hooks';

const Product = ({ user }) => {
  const { message } = App.useApp();
  const { isMobile } = useResponsive();
  const { materials: products, loadMaterials } = useMaterials();
  const { products: productList, loadProducts, pagination: productPagination, setPagination: setProductPagination } = useProducts();
  
  const [productForm] = Form.useForm();
  const [productInForm] = Form.useForm();
  const [productOutForm] = Form.useForm();
  const [productRestoreForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [searchKeywords, setSearchKeywords] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [batchDeleteModalVisible, setBatchDeleteModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [productFileList, setProductFileList] = useState([]);
  const [editProductFileList, setEditProductFileList] = useState([]);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [stockFilter, setStockFilter] = useState(null);
  const [possibleFilter, setPossibleFilter] = useState(null);
  const [sortInfo, setSortInfo] = useState(null);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [inModalVisible, setInModalVisible] = useState(false);
  const [outModalVisible, setOutModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [statsCollapsed, setStatsCollapsed] = useState(() => {
    const saved = localStorage.getItem('product_statsCollapsed');
    return saved === 'true';
  });
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [inLoading, setInLoading] = useState(false);
  const [outLoading, setOutLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [importHelpVisible, setImportHelpVisible] = useState(false);
  const [importResultVisible, setImportResultVisible] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // 计算材料成本价格
  const calculateMaterialPrice = (materials, priceType = 'in_price') => {
    if (!materials || !Array.isArray(materials) || !products) return 0;
    return materials.reduce((total, material) => {
      if (material && material.product_id && material.quantity) {
        const materialItem = products.find(p => String(p.id) === String(material.product_id));
        if (materialItem) {
          const price = materialItem[priceType] || 0;
          return total + (price * material.quantity);
        }
      }
      return total;
    }, 0);
  };

  // 监听添加产品表单材料变化
  const addFormMaterials = Form.useWatch('materials', productForm);
  const addFormOtherPrice = Form.useWatch('other_price', productForm);
  
  useEffect(() => {
    if (addFormMaterials && Array.isArray(addFormMaterials)) {
      // 过滤掉空值和无效材料
      const validMaterials = addFormMaterials.filter(m => m && m.product_id && m.quantity);
      if (validMaterials.length > 0) {
        const inPrice = calculateMaterialPrice(validMaterials, 'in_price');
        const outPrice = calculateMaterialPrice(validMaterials, 'out_price') + (addFormOtherPrice || 0);
        
        productForm.setFieldsValue({
          in_price: inPrice,
          out_price: outPrice
        });
      } else if (addFormMaterials.length === 0) {
        // 如果材料清单为空，重置价格为0
        productForm.setFieldsValue({
          in_price: 0,
          out_price: 0
        });
      }
    }
  }, [addFormMaterials, addFormOtherPrice, products]);

  // 监听编辑产品表单材料变化
  const editFormMaterials = Form.useWatch('materials', editForm);
  const editFormOtherPrice = Form.useWatch('other_price', editForm);
  
  useEffect(() => {
    if (editFormMaterials && Array.isArray(editFormMaterials)) {
      // 过滤掉空值和无效材料
      const validMaterials = editFormMaterials.filter(m => m && m.product_id && m.quantity);
      
      // 只要有材料数组（无论是否为空），都重新计算价格
      const inPrice = calculateMaterialPrice(validMaterials, 'in_price');
      const outPrice = calculateMaterialPrice(validMaterials, 'out_price') + (editFormOtherPrice || 0);
      
      editForm.setFieldsValue({
        in_price: inPrice,
        out_price: outPrice
      });
    }
  }, [editFormMaterials, editFormOtherPrice, products]);

  const handleProductIn = async (values) => {
    if (inLoading) return;
    setInLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.productIn({ ...values, username: user.username });
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      if (response.data.success) {
        message.success('产品入库成功');
        setInModalVisible(false);
        productInForm.resetFields();
        setInLoading(false);
        loadProducts();
        loadMaterials();
      } else {
        message.error(response.data.message || '产品入库失败');
        setInLoading(false);
      }
    } catch (error) {
      message.error('产品入库失败');
      setInLoading(false);
    }
  };

  const handleProductOut = async (values) => {
    if (outLoading) return;
    setOutLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.productOut({ ...values, username: user.username });
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      if (response.data.success) {
        message.success(`产品出库成功，收益: ¥${response.data.revenue || 0}`);
        setOutModalVisible(false);
        productOutForm.resetFields();
        setOutLoading(false);
        loadProducts();
      } else {
        message.error(response.data.message || '产品出库失败');
        setOutLoading(false);
      }
    } catch (error) {
      message.error('产品出库失败');
      setOutLoading(false);
    }
  };

  const handleProductRestore = async (values) => {
    if (restoreLoading) return;
    setRestoreLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.productRestore({ ...values, username: user.username });
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      if (response.data.success) {
        message.success('产品还原成功');
        setRestoreModalVisible(false);
        productRestoreForm.resetFields();
        setRestoreLoading(false);
        loadProducts();
        loadMaterials();
      } else {
        message.error(response.data.message || '产品还原失败');
        setRestoreLoading(false);
      }
    } catch (error) {
      message.error('产品还原失败');
      setRestoreLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditModalVisible(true);
    
    // 设置现有图片
    if (product.image_path) {
      setEditProductFileList([{
        uid: '-1',
        name: 'image.jpg',
        status: 'done',
        url: `http://localhost:5274/${product.image_path}`
      }]);
    } else {
      setEditProductFileList([]);
    }
    
    // 设置表单值
    setTimeout(() => {
      editForm.setFieldsValue({
        name: product.name,
        in_price: product.in_price || 0,
        out_price: product.out_price || 0,
        other_price: product.other_price || 0,
        materials: product.materials.map(m => ({
          product_id: String(m.product_id),
          quantity: m.required
        }))
      });
    }, 100);
  };

  const handleUpdateProduct = async (values) => {
    if (editLoading) return;
    setEditLoading(true);
    try {
      const startTime = Date.now();
      const materials = values.materials ? values.materials.reduce((acc, material) => {
        acc[material.product_id] = material.quantity;
        return acc;
      }, {}) : {};
      
      const updateData = {
        name: values.name,
        materials: materials,
        in_price: values.in_price || 0,
        out_price: values.out_price || 0,
        other_price: values.other_price || 0
      };
      
      const response = await api.updateProduct(editingProduct.id, updateData);
      
      if (response.data.success) {
        const hasNewImage = editProductFileList.length > 0 && editProductFileList[0].originFileObj;
        
        if (hasNewImage) {
          const formData = new FormData();
          formData.append('image', editProductFileList[0].originFileObj);
          
          const imageResponse = await fetch('http://localhost:5274/upload/image', {
            method: 'POST',
            body: formData
          });
          
          const imageResult = await imageResponse.json();
          
          if (imageResult.success) {
            await api.updateProduct(editingProduct.id, {
              image_path: imageResult.image_path
            });
          }
        }
        
        const elapsed = Date.now() - startTime;
        const minDelay = Math.max(0, 500 - elapsed);
        if (minDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, minDelay));
        }
        
        message.success('产品更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditProductFileList([]);
        setEditLoading(false);
        loadProducts();
      } else {
        message.error(response.data.message || '产品更新失败');
        setEditLoading(false);
      }
    } catch (error) {
      console.error('Update product error:', error);
      message.error('产品更新失败');
      setEditLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.deleteProduct(deletingProduct.id, { username: user.username });
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      if (response.data.success) {
        message.success('产品删除成功');
        setDeleteModalVisible(false);
        setDeletingProduct(null);
        setDeleteLoading(false);
        loadProducts();
      } else {
        message.error(response.data.message || '产品删除失败');
        setDeleteLoading(false);
      }
    } catch (error) {
      message.error('产品删除失败');
      setDeleteLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (batchDeleteLoading) return;
    setBatchDeleteLoading(true);
    try {
      const startTime = Date.now();
      const response = await api.batchDeleteProducts(selectedRowKeys, user.username);
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      if (response.data.success) {
        const deletedCount = response.data.deleted_count || 0;
        message.success(response.data.message || `成功删除 ${deletedCount} 个产品`);
        setBatchDeleteModalVisible(false);
        setSelectedRowKeys([]);
        setBatchDeleteLoading(false);
        loadProducts();
      } else {
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
                  <span style={{ color: '#52c41a' }}>✓ 成功删除 {response.data.deleted_count} 个产品</span>
                </div>
              )}
              {response.data.failed_products && response.data.failed_products.length > 0 && (
                <div>
                  <p style={{ marginBottom: '8px', fontWeight: '500' }}>失败的产品：</p>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '6px' 
                  }}>
                    {response.data.failed_products.map((item, index) => (
                      <div key={index} style={{ 
                        padding: '8px 12px', 
                        borderBottom: index < response.data.failed_products.length - 1 ? '1px solid #f0f0f0' : 'none',
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
          loadProducts();
        } else {
          setBatchDeleteLoading(false);
        }
      }
    } catch (error) {
      message.error('批量删除失败');
      setBatchDeleteLoading(false);
    }
  };

  const handleSearchChange = (selectedValues) => {
    setSearchKeywords(selectedValues);
  };

  const getSearchOptions = () => {
    return (productList || []).map(product => ({
      value: product.name,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {product.image_path ? (
            <img 
              src={`http://localhost:5274/${product.image_path}`} 
              alt={product.name}
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
          <span>{product.name}</span>
        </div>
      )
    }));
  };

  const filteredProducts = (productList || []).filter(product => {
    // 搜索筛选
    if (searchKeywords.length > 0) {
      const matchesSearch = searchKeywords.some(keyword => 
        (product.name && product.name.toLowerCase().includes(keyword.toLowerCase())) ||
        (product.id && String(product.id).toLowerCase().includes(keyword.toLowerCase()))
      );
      if (!matchesSearch) return false;
    }
    
    // 库存筛选
    if (stockFilter === 'zero' && (product.stock_count || 0) > 0) return false;
    if (stockFilter === 'low' && (product.stock_count || 0) > 5) return false;
    if (stockFilter === 'normal' && (product.stock_count || 0) <= 5) return false;
    
    // 可制作筛选
    if (possibleFilter === 'zero' && (product.possible_quantity || 0) > 0) return false;
    if (possibleFilter === 'low' && (product.possible_quantity || 0) >= 5) return false;
    if (possibleFilter === 'high' && (product.possible_quantity || 0) < 5) return false;
    
    return true;
  });

  useEffect(() => {
    if (!user) return;
    loadProducts(message.error);
    loadMaterials(message.error);
  }, [user]);

  const uploadFormData = async (endpoint, data, file, fieldName) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));
    formData.append(fieldName, file);
    const res = await fetch(`${Config.API_BASE_URL}${endpoint}`, { method: 'POST', body: formData });
    return { data: await res.json() };
  };

  const addProduct = async (values) => {
    if (addLoading) return;
    setAddLoading(true);
    try {
      const startTime = Date.now();
      const materials = {};
      if (values.materials) {
        values.materials.forEach(m => {
          if (m.product_id && m.quantity) materials[m.product_id] = parseInt(m.quantity);
        });
      }
      
      let imagePath = null;
      if (productFileList?.length > 0 && productFileList[0].originFileObj) {
        const result = await uploadFormData('/upload/image', {}, productFileList[0].originFileObj, 'image');
        if (result.data.success) imagePath = result.data.image_path;
      }
      
      const response = await api.addProduct({ 
        name: values.name, 
        materials, 
        in_price: values.in_price || 0,
        out_price: values.out_price || 0,
        other_price: values.other_price || 0, 
        image_path: imagePath, 
        username: user.username 
      });
      
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      if (response.data.success) {
        message.success('产品添加成功');
        setAddProductModalVisible(false);
        productForm.resetFields();
        productForm.setFieldsValue({ materials: [] });
        setProductFileList([]);
        setAddLoading(false);
        loadProducts(message.error);
      } else {
        message.error(response.data.message || '产品添加失败');
        setAddLoading(false);
      }
    } catch (error) {
      console.error('产品添加失败:', error);
      message.error('产品添加失败: ' + (error.response?.data?.message || error.message));
      setAddLoading(false);
    }
  };

  const handleProductImageUpload = ({ fileList: newFileList }) => {
    setProductFileList(newFileList);
  };

  const handlePreview = (file) => {
    setPreviewImage(file.url || file.response?.url);
    setImagePreviewVisible(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', user.username);
    
    try {
      const startTime = Date.now();
      const response = await api.importProducts(formData);
      const elapsed = Date.now() - startTime;
      const minDelay = Math.max(0, 500 - elapsed);
      if (minDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, minDelay));
      }
      
      setImportResult(response.data);
      setImportResultVisible(true);
      
      if (response.data.success) {
        loadProducts();
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
      const products = selectedRowKeys.length > 0 
        ? selectedRowKeys 
        : filteredProducts.map(p => p.id);
      
      if (products.length > 1000) {
        Modal.warning({
          title: '导出数量过多',
          content: `当前选择了 ${products.length} 个产品，数据量过大。请使用筛选功能减少导出数量（建议不超过1000个）。`
        });
        setExportLoading(false);
        return;
      }
      
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const productIds = products.join(',');
      api.exportProducts(productIds, user.username);
    } finally {
      setExportLoading(false);
    }
  };

  // 计算统计数据
  const totalProductCount = (productList || []).length;
  const totalStock = (productList || []).reduce((sum, product) => sum + (product.stock_count || 0), 0);
  const totalProductValue = (productList || []).reduce((sum, product) => {
    if (!product.materials || !Array.isArray(product.materials) || (product.stock_count || 0) === 0 || !products) {
      return sum;
    }
    
    const materialCost = product.materials.reduce((cost, material) => {
      const materialItem = products.find(p => String(p.id) === String(material.product_id));
      if (materialItem && material.required) {
        const price = materialItem.out_price || materialItem.in_price || 0;
        return cost + (price * material.required);
      }
      return cost;
    }, 0);
    
    return sum + (materialCost * product.stock_count);
  }, 0);

  const CELL_HEIGHT = 60;

  const renderMobileCards = () => (
    <>
      <div  style={{ marginTop: '16px', height: 'calc(100vh - 320px)', overflow: 'auto' }}>
        {filteredProducts.map((product) => {
          const isSelected = selectedRowKeys.includes(product.id);
          return (
            <Card
              key={product.id}
              style={{
                marginBottom: '12px',
                border: `1px solid ${isSelected ? '#1890ff' : '#d9d9d9'}`,
                position: 'relative'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              {user.role === 'admin' && (
                <Checkbox
                  id={`product-card-checkbox-${product.id}`}
                  style={{ position: 'absolute', top: '12px', right: '12px' }}
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRowKeys([...selectedRowKeys, product.id]);
                    } else {
                      setSelectedRowKeys(selectedRowKeys.filter(k => k !== product.id));
                    }
                  }}
                />
              )}
              <Tooltip title={product.name.length > 10 ? product.name : null}>
                <Typography.Text ellipsis style={{ width: '80%', fontWeight: '600', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                  {product.name}
                </Typography.Text>
              </Tooltip>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: product.image_path ? 'transparent' : '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {product.image_path ? (
                    <Image
                      width={80}
                      height={80}
                      src={`http://localhost:5274/${product.image_path}`}
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
                    成本: <span style={{ fontWeight: '600' }}>¥{(() => {
                      if (!product.materials || !Array.isArray(product.materials) || product.materials.length === 0) {
                        return (product.in_price || 0).toFixed(2);
                      }
                      if (!products) return '0.00';
                      const cost = product.materials.reduce((c, m) => {
                        const mat = products.find(p => String(p.id) === String(m.product_id));
                        return c + (mat && m.required ? (mat.in_price || 0) * m.required : 0);
                      }, 0);
                      return cost.toFixed(2);
                    })()}</span>
                  </div>
                  <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    售价: <span style={{ fontWeight: '600' }}>¥{(() => {
                      if (!product.materials || !Array.isArray(product.materials) || product.materials.length === 0) {
                        return (product.out_price || 0).toFixed(2);
                      }
                      if (!products) return '0.00';
                      const price = product.materials.reduce((p, m) => {
                        const mat = products.find(pr => String(pr.id) === String(m.product_id));
                        return p + (mat && m.required ? (mat.out_price || 0) * m.required : 0);
                      }, 0) + (product.other_price || 0);
                      return price.toFixed(2);
                    })()}</span>
                  </div>
                  <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    库存: <span style={{ 
                      fontWeight: '600',
                      color: (product.stock_count || 0) > 5 ? '#52c41a' : (product.stock_count || 0) > 0 ? '#faad14' : '#ff4d4f'
                    }}>
                      {product.stock_count || 0}
                    </span>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '60px' }}>
                    <Button 
                      type="primary"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditProduct(product)}
                      style={{ padding: '4px 8px' }}
                    >
                      编辑
                    </Button>
                    <Button 
                      size="small"
                      icon={<ImportOutlined />}
                      onClick={() => {
                        setSelectedProduct(product);
                        setInModalVisible(true);
                      }}
                      style={{ padding: '4px 8px', color: '#52c41a', borderColor: '#52c41a' }}
                    >
                      入库
                    </Button>
                    <Button 
                      size="small"
                      icon={<ExportOutlined />}
                      onClick={() => {
                        setSelectedProduct(product);
                        setOutModalVisible(true);
                      }}
                      style={{ padding: '4px 8px', color: '#faad14', borderColor: '#faad14' }}
                    >
                      出库
                    </Button>
                    <Button 
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={() => {
                        setSelectedProduct(product);
                        setRestoreModalVisible(true);
                      }}
                      style={{ padding: '4px 8px', color: '#1890ff', borderColor: '#1890ff' }}
                    >
                      还原
                    </Button>
                  </div>
                )}
              </div>
              {product.materials && product.materials.length > 0 && (
                <div 
                  style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #d9d9d9'
                  }}
                >
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const expandedKeys = expandedRowKeys.includes(product.id) 
                        ? expandedRowKeys.filter(key => key !== product.id)
                        : [...expandedRowKeys, product.id];
                      setExpandedRowKeys(expandedKeys);
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>材料清单</span>
                    {expandedRowKeys.includes(product.id) ? <UpOutlined style={{ fontSize: '10px' }} /> : <DownOutlined style={{ fontSize: '10px' }} />}
                  </div>
                  {expandedRowKeys.includes(product.id) && (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {product.materials.map(material => {
                        const mat = products?.find(p => String(p.id) === String(material.product_id));
                        return (
                          <div key={material.product_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }} onClick={(e) => e.stopPropagation()}>
                            {mat?.image_path ? (
                              <img 
                                src={`http://localhost:5274/${mat.image_path}`} 
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
                            <Tooltip title={(material.name || mat?.name || material.product_id)?.length > 10 ? (material.name || mat?.name || material.product_id) : null}>
                              <span style={{ fontWeight: '500', maxWidth: '100px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.name || mat?.name || material.product_id}:</span>
                            </Tooltip>
                            <span>需要 {material.required || 0} 个</span>
                            <span style={{ 
                              color: (material.stock || mat?.stock_count || 0) >= (material.required || 0) ? '#52c41a' : '#ff4d4f',
                              fontWeight: '500'
                            }}>
                              库存 {material.stock || mat?.stock_count || 0}
                            </span>
                          </div>
                        );
                      })}
                    </Space>
                  )}
                </div>
              )}
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
        scroll={{ x: 1200, y: window.innerHeight - 320 }}
        columns={getColumns()}
        dataSource={filteredProducts} 
        rowKey="id" 
        rowSelection={user.role === 'admin' ? {
          selectedRowKeys,
          onChange: (newSelectedRowKeys) => {
            setSelectedRowKeys(newSelectedRowKeys);
          },
          columnWidth: 36,
          fixed: 'left',
          getCheckboxProps: (record) => ({ id: `product-checkbox-${record.id}`, name: `product-checkbox-${record.id}` }),
          selectAllProps: { id: 'product-select-all', name: 'product-select-all' }
        } : undefined}
        pagination={false}
        style={{ 
          marginTop: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '12px 0', fontSize: '12px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>材料清单：</div>
              {record.materials && record.materials.map(material => {
                const product = products.find(p => String(p.id) === String(material.product_id));
                return (
                  <div key={material.product_id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '6px', 
                    padding: '4px 0' 
                  }}>
                    {product?.image_path ? (
                      <img 
                        src={`http://localhost:5274/${product.image_path}`} 
                        alt={product.name}
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
                    <Tooltip title={(material.name || product?.name || material.product_id)?.length > 15 ? (material.name || product?.name || material.product_id) : null}>
                      <span style={{ fontWeight: '500', maxWidth: '150px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.name || product?.name || material.product_id}: </span>
                    </Tooltip>
                    <span>需要 {material.required || 0} 个</span>
                    <span style={{ 
                      color: (material.stock || product?.stock_count || 0) >= (material.required || 0) ? '#52c41a' : '#ff4d4f',
                      marginLeft: '12px',
                      fontWeight: '500'
                    }}>
                      库存 {material.stock || product?.stock_count || 0} 个
                    </span>
                  </div>
                );
              })}
            </div>
          ),
          rowExpandable: (record) => record.materials && record.materials.length > 0,
          expandedRowKeys,
          onExpand: (expanded, record) => {
            const keys = expanded 
              ? [...expandedRowKeys, record.id]
              : expandedRowKeys.filter(key => key !== record.id);
            setExpandedRowKeys(keys);
          },
          showExpandColumn: false,
        }}
      />
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px' }}>
        共 {filteredProducts.length} 个产品
      </div>
      
      <style>{`
        .ant-table-thead > tr > th {
          font-weight: 600 !important;
          border-bottom: 2px solid #1890ff !important;
        }
        .ant-table-thead > tr > th:first-child {
          text-align: center !important;
        }
        .ant-table-selection-column {
          text-align: center !important;
        }
        .ant-table-tbody > tr > td.ant-table-selection-column {
          text-align: center !important;
          vertical-align: middle !important;
          padding: 16px 8px !important;
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
      `}</style>
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
      ),
    },
    { 
      title: '名称', 
      dataIndex: 'name', 
      key: 'name',
      width: isMobile ? 100 : 150,
      render: (text) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center' }}>
          <Tooltip title={text}>
            <span style={{ 
              fontWeight: '500', 
              fontSize: '14px',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: isMobile ? '80px' : '130px'
            }}>
              {text}
            </span>
          </Tooltip>
        </div>
      )
    },
    {
      title: '成本',
      key: 'cost',
      width: 80,
      align: 'center',
      sorter: (a, b) => {
        const getCost = (record) => {
          if (!record.materials || !Array.isArray(record.materials)) return 0;
          return record.materials.reduce((cost, material) => {
            const materialItem = products.find(p => String(p.id) === String(material.product_id));
            if (materialItem && material.required) {
              const price = materialItem.in_price || 0;
              return cost + (price * material.required);
            }
            return cost;
          }, 0);
        };
        return getCost(a) - getCost(b);
      },
      render: (_, record) => {
        // 如果没有材料或材料为空，直接显示数据库中的成本价
        if (!record.materials || !Array.isArray(record.materials) || record.materials.length === 0) {
          return (
            <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ 
                fontWeight: '500',
                fontSize: '14px'
              }}>
                ¥{(record.in_price || 0).toFixed(2)}
              </span>
            </div>
          );
        }
        
        if (!products) {
          return <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>-</span></div>;
        }
        
        const materialCost = record.materials.reduce((cost, material) => {
          const materialItem = products.find(p => String(p.id) === String(material.product_id));
          if (materialItem && material.required) {
            const price = materialItem.in_price || 0;
            return cost + (price * material.required);
          }
          return cost;
        }, 0);
        
        return (
          <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ 
              fontWeight: '500',
              fontSize: '14px'
            }}>
              ¥{materialCost.toFixed(2)}
            </span>
          </div>
        );
      }
    },
    {
      title: '售价',
      key: 'selling_price',
      width: 80,
      align: 'center',
      sorter: (a, b) => {
        const getSellingPrice = (record) => {
          if (!record.materials || !Array.isArray(record.materials)) return 0;
          const materialSellingPrice = record.materials.reduce((price, material) => {
            const materialItem = products.find(p => String(p.id) === String(material.product_id));
            if (materialItem && material.required) {
              const outPrice = materialItem.out_price || 0;
              return price + (outPrice * material.required);
            }
            return price;
          }, 0);
          return materialSellingPrice + (record.other_price || 0);
        };
        return getSellingPrice(a) - getSellingPrice(b);
      },
      render: (_, record) => {
        // 如果没有材料或材料为空，直接显示数据库中的售价
        if (!record.materials || !Array.isArray(record.materials) || record.materials.length === 0) {
          return (
            <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ 
                fontWeight: '600',
                fontSize: '14px'
              }}>
                ¥{(record.out_price || 0).toFixed(2)}
              </span>
            </div>
          );
        }
        
        if (!products) {
          return <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>-</span></div>;
        }
        
        const materialSellingPrice = record.materials.reduce((price, material) => {
          const materialItem = products.find(p => String(p.id) === String(material.product_id));
          if (materialItem && material.required) {
            const outPrice = materialItem.out_price || 0;
            return price + (outPrice * material.required);
          }
          return price;
        }, 0);
        
        const totalSellingPrice = materialSellingPrice + (record.other_price || 0);
        
        return (
          <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              ¥{totalSellingPrice.toFixed(2)}
            </span>
          </div>
        );
      }
    },
    { 
      title: '可制作', 
      dataIndex: 'possible_quantity', 
      key: 'possible_quantity',
      width: 100,
      align: 'center',
      sorter: (a, b) => (a.possible_quantity || 0) - (b.possible_quantity || 0),
      render: (quantity) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ 
            color: quantity > 0 ? '#52c41a' : '#ff4d4f',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            {quantity}
          </span>
        </div>
      )
    },
    { 
      title: '库存', 
      dataIndex: 'stock_count', 
      key: 'stock_count',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.stock_count || 0) - (b.stock_count || 0),
      render: (quantity) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ 
            color: '#faad14', 
            fontWeight: '600', 
            fontSize: '14px'
          }}>
            {quantity || 0}
          </span>
        </div>
      )
    },
    {
      title: '详情',
      key: 'detail',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {record.materials && record.materials.length > 0 ? (
            <EyeOutlined 
              style={{ 
                fontSize: '16px', 
                cursor: 'pointer',
                color: expandedRowKeys.includes(record.id) ? '#1890ff' : '#666'
              }}
              onClick={() => {
                const expandedKeys = expandedRowKeys.includes(record.id) 
                  ? expandedRowKeys.filter(key => key !== record.id)
                  : [...expandedRowKeys, record.id];
                setExpandedRowKeys(expandedKeys);
              }}
            />
          ) : null}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <div style={{ height: CELL_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '140px' }}>
            {user.role === 'admin' ? (
              <>
                <Button 
                  size="small" 
                  type="primary"
                  ghost
                  icon={<EditOutlined />}
                  onClick={() => handleEditProduct(record)}
                  style={{ padding: '4px 8px' }}
                >
                  {isMobile ? '' : '编辑'}
                </Button>
                <Button 
                  size="small" 
                  icon={<ImportOutlined />}
                  onClick={() => {
                    setSelectedProduct(record);
                    setInModalVisible(true);
                  }}
                  style={{ padding: '4px 8px', color: '#52c41a', borderColor: '#52c41a' }}
                >
                  {isMobile ? '' : '入库'}
                </Button>
                <Button 
                  size="small" 
                  icon={<ExportOutlined />}
                  onClick={() => {
                    setSelectedProduct(record);
                    setOutModalVisible(true);
                  }}
                  style={{ padding: '4px 8px', color: '#faad14', borderColor: '#faad14' }}
                >
                  {isMobile ? '' : '出库'}
                </Button>
                <Button 
                  size="small" 
                  icon={<UndoOutlined />}
                  onClick={() => {
                    setSelectedProduct(record);
                    setRestoreModalVisible(true);
                  }}
                  style={{ padding: '4px 8px', color: '#1890ff', borderColor: '#1890ff' }}
                >
                  {isMobile ? '' : '还原'}
                </Button>
              </>
            ) : null}

          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <input
        id="product-import-input"
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
                localStorage.setItem('product_statsCollapsed', newValue);
              }}
            >
              <span style={{ fontWeight: '600', fontSize: '13px' }}>数据概览</span>
              {statsCollapsed ? <DownOutlined style={{ fontSize: '10px' }} /> : <UpOutlined style={{ fontSize: '10px' }} />}
            </div>
            {!statsCollapsed && (
              <Space direction="vertical" size="small" style={{ width: '100%', marginTop: '12px' }}>
                <Card style={{ marginBottom: '8px' }} styles={{ body: { padding: '12px' } }}>
                  <Statistic 
                    title="产品种类" 
                    value={totalProductCount} 
                    prefix={<AppstoreOutlined style={{ color: '#1890ff', fontSize: '16px' }} />}
                    valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    style={{ fontSize: '12px' }}
                  />
                </Card>
                <Card style={{ marginBottom: '8px' }} styles={{ body: { padding: '12px' } }}>
                  <Statistic 
                    title="产品总数量" 
                    value={totalStock} 
                    prefix={<BarChartOutlined style={{ color: '#52c41a', fontSize: '16px' }} />}
                    valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                    style={{ fontSize: '12px' }}
                  />
                </Card>
                <Card style={{ marginBottom: '0px' }} styles={{ body: { padding: '12px' } }}>
                  <Statistic 
                    title="产品总价值" 
                    value={totalProductValue} 
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
          <Flex gap="small" wrap="wrap">
            <Card style={{ flex: '1 1 125px', minWidth: '125px' }} styles={{ body: { padding: '24px' } }}>
              <Statistic 
                title="产品种类"
                value={totalProductCount} 
                prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
            <Card style={{ flex: '1 1 125px', minWidth: '125px' }} styles={{ body: { padding: '24px' } }}>
              <Statistic 
                title="产品总数量"
                value={totalStock} 
                prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
            <Card style={{ flex: '1 1 125px', minWidth: '125px' }} styles={{ body: { padding: '24px' } }}>
              <Statistic 
                title="产品总价值"
                value={totalProductValue} 
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Flex>
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
                placeholder="搜索产品"
                style={{ width: '100%' }}
                allowClear
                showSearch
                optionLabelProp="label"
                filterOption={(input, option) => {
                  const product = (productList || []).find(f => f.name === option.value);
                  return product && (
                    product.name.toLowerCase().includes(input.toLowerCase()) ||
                    product.id.toLowerCase().includes(input.toLowerCase())
                  );
                }}
                maxTagCount="responsive"
                getPopupContainer={(triggerNode) => triggerNode.parentElement}
              >
                {(productList || []).map((product, index) => (
                  <Select.Option 
                    key={`search-${product.id}-${index}`} 
                    value={product.name}
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {product.image_path ? (
                          <img 
                            src={`http://localhost:5274/${product.image_path}`} 
                            alt={product.name}
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
                        <span>{product.name}</span>
                      </div>
                    }
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {product.image_path ? (
                        <img 
                          src={`http://localhost:5274/${product.image_path}`} 
                          alt=""
                          style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <PictureOutlined style={{ color: '#ccc', fontSize: '14px' }} />
                        </div>
                      )}
                      <div>
                        <div>{product.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          可制作: <span style={{ color: product.possible_quantity > 0 ? '#52c41a' : '#ff4d4f', fontWeight: '500' }}>{product.possible_quantity}</span>
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
                    placeholder="可制作筛选"
                    value={possibleFilter}
                    onChange={setPossibleFilter}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="zero">可制作=0</Select.Option>
                    <Select.Option value="low">可制作&lt;5</Select.Option>
                    <Select.Option value="high">可制作≥5</Select.Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <Button 
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddProductModalVisible(true)}
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
                  placeholder="选择产品进行搜索"
                  style={{ flex: 1 }}
                  allowClear
                  showSearch
                  optionLabelProp="label"
                  filterOption={(input, option) => {
                    const product = (productList || []).find(f => f.name === option.value);
                    return product && (
                      product.name.toLowerCase().includes(input.toLowerCase()) ||
                      product.id.toLowerCase().includes(input.toLowerCase())
                    );
                  }}
                  maxTagCount="responsive"
                  getPopupContainer={(triggerNode) => triggerNode.parentElement}
                >
                  {(productList || []).map((product, index) => (
                    <Select.Option 
                      key={`search-${product.id}-${index}`} 
                      value={product.name}
                      label={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {product.image_path ? (
                            <img 
                              src={`http://localhost:5274/${product.image_path}`} 
                              alt={product.name}
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
                          <span>{product.name}</span>
                        </div>
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {product.image_path ? (
                          <img 
                            src={`http://localhost:5274/${product.image_path}`} 
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <PictureOutlined style={{ color: '#ccc', fontSize: '14px' }} />
                          </div>
                        )}
                        <div>
                          <div>{product.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            可制作: <span style={{ color: product.possible_quantity > 0 ? '#52c41a' : '#ff4d4f', fontWeight: '500' }}>{product.possible_quantity}</span>
                          </div>
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
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
                  placeholder="可制作筛选"
                  value={possibleFilter}
                  onChange={setPossibleFilter}
                  allowClear
                  style={{ width: 120 }}
                >
                  <Select.Option value="zero">可制作=0</Select.Option>
                  <Select.Option value="low">可制作&lt;5</Select.Option>
                  <Select.Option value="high">可制作≥5</Select.Option>
                </Select>
              </div>
              {user.role === 'admin' && (
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button 
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddProductModalVisible(true)}
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
        title="添加产品"
        open={addProductModalVisible}
        onCancel={() => {
          setAddProductModalVisible(false);
          productForm.resetFields();
          setProductFileList([]);
        }}
        footer={null}
        width={isMobile ? '95%' : 800}
        style={{ top: isMobile ? 20 : 100 }}
      >
        <Spin spinning={addLoading} tip="添加中...">
        <Form form={productForm} layout="vertical" onFinish={(values) => {
          addProduct(values);
        }}>
          <Row gutter={24} align="top">
            <Col xs={24} md={16}>
              <Form.Item 
                name="name" 
                label="产品名称"
                rules={[
                  { required: true, message: '请输入产品名称' },
                  { max: 100, message: '产品名称不能超过100个字符' },
                  {
                    validator: (_, value) => {
                      if (value && (productList || []).some(product => product.name === value)) {
                        return Promise.reject(new Error('产品名称已存在，请使用其他名称'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  id="product-name"
                  placeholder="请输入产品名称（如：红玛瑙手串）" 
                  allowClear 
                  maxLength={100}
                  showCount
                  prefix={<AppstoreOutlined style={{ color: '#1890ff' }} />}
                />
              </Form.Item>
              <Form.Item 
                name="in_price" 
                label="成本价"
                initialValue={0}
              >
                <InputNumber 
                  id="product-in-price"
                  placeholder="0.00" 
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  prefix="¥"
                  readOnly={addFormMaterials && addFormMaterials.filter(m => m && m.product_id && m.quantity).length > 0}
                />
              </Form.Item>
              <Form.Item 
                name="out_price" 
                label="售价"
                initialValue={0}
              >
                <InputNumber 
                  id="product-out-price"
                  placeholder="0.00" 
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  prefix="¥"
                  readOnly={addFormMaterials && addFormMaterials.filter(m => m && m.product_id && m.quantity).length > 0}
                />
              </Form.Item>
              <Form.Item 
                name="other_price" 
                label="其它费用"
                initialValue={0}
              >
                <InputNumber 
                  id="product-other-price"
                  placeholder="0.00" 
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="image" label="产品效果图">
                <ImageUpload 
                  fileList={productFileList}
                  onChange={handleProductImageUpload}
                  text="上传图片"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.List name="materials">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <span>
                    材料清单 {fields.length > 0 && `(${fields.length}种材料)`}
                  </span>
                  <Button 
                    type="primary" 
                    ghost 
                    size="small"
                    onClick={() => add()} 
                    icon={<PlusOutlined />}
                  >
                    {isMobile ? '' : '添加材料'}
                  </Button>
                </div>
                
                {fields.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px',
                    marginBottom: '16px',
                    color: '#666'
                  }}>
                    暂无材料清单（可选），点击上方按钮添加材料
                  </div>
                )}
                
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <div key={key}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'flex-end',
                        marginBottom: '12px'
                      }}>
                        <Button 
                          type="text" 
                          size="small"
                          onClick={() => remove(name)} 
                          style={{ color: '#ff4d4f' }}
                          icon={<DeleteOutlined />}
                        >
                          删除
                        </Button>
                      </div>
                      <Row gutter={12}>
                        <Col xs={24} sm={16}>
                          <Form.Item
                            {...restField}
                            name={[name, 'product_id']}
                            rules={[{ required: true, message: '请选择材料' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select 
                              placeholder="选择材料" 
                              style={{ width: '100%' }}
                              showSearch
                              allowClear
                              optionLabelProp="label"
                              filterOption={(input, option) => {
                                const product = products.find(p => p.id === option.value);
                                return product && (
                                  product.name.toLowerCase().includes(input.toLowerCase()) ||
                                  product.id.toLowerCase().includes(input.toLowerCase())
                                );
                              }}
                              getPopupContainer={(triggerNode) => triggerNode.parentElement}
                            >
                              {(products || []).filter(product => product && product.id).map((product, index) => (
                                <Select.Option 
                                  key={`${product.id}-${index}`} 
                                  value={product.id}
                                  label={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {product.image_path ? (
                                        <img 
                                          src={`http://localhost:5274/${product.image_path}`} 
                                          alt={product.name}
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
                                      <span>{product.name}</span>
                                    </div>
                                  }
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {product.image_path ? (
                                      <img 
                                        src={`http://localhost:5274/${product.image_path}`} 
                                        alt={product.name}
                                        style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div style={{
                                        width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '4px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                      }}>
                                        <PictureOutlined style={{ color: '#ccc', fontSize: '14px' }} />
                                      </div>
                                    )}
                                    <div>
                                      <div>{product.name}</div>
                                      <div style={{ 
                                        fontSize: '12px', 
                                        color: product.stock_count > 10 ? '#52c41a' : product.stock_count > 0 ? '#faad14' : '#ff4d4f',
                                        fontWeight: '500'
                                      }}>
                                        库存: {product.stock_count}
                                      </div>
                                    </div>
                                  </div>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            rules={[{ required: true, message: '请输入数量' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber 
                              placeholder="数量" 
                              min={1}
                              max={999999}
                              style={{ width: '100%', borderRadius: '6px' }}
                              addonAfter="个"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Space>
              </div>
            )}
          </Form.List>
          
          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                productForm.resetFields();
                setProductFileList([]);
              }} disabled={addLoading}>
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
        title="编辑产品"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Spin spinning={editLoading} tip="更新中...">
        <Form form={editForm} layout="vertical" onFinish={handleUpdateProduct}>
          <Row gutter={24}>
            <Col xs={24} md={16}>
              <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
                <Input 
                  id="product-edit-name" 
                  placeholder="产品名称" 
                  allowClear
                />
              </Form.Item>
              <Form.Item name="in_price" label="成本价">
                <InputNumber 
                  id="product-edit-in-price"
                  placeholder="0.00" 
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  prefix="¥"
                  readOnly={editFormMaterials && editFormMaterials.filter(m => m && m.product_id && m.quantity).length > 0}
                />
              </Form.Item>
              <Form.Item name="out_price" label="售价">
                <InputNumber 
                  id="product-edit-out-price"
                  placeholder="0.00" 
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  prefix="¥"
                  readOnly={editFormMaterials && editFormMaterials.filter(m => m && m.product_id && m.quantity).length > 0}
                />
              </Form.Item>
              <Form.Item name="other_price" label="其它费用">
                <InputNumber 
                  id="product-edit-other-price"
                  placeholder="0.00" 
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="产品图片">
                <ImageUpload 
                  fileList={editProductFileList}
                  onChange={({ fileList }) => setEditProductFileList(fileList)}
                  text="上传图片"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.List name="materials">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <span>
                    材料清单 {fields.length > 0 && `(${fields.length}种材料)`}
                  </span>
                  <Button 
                    type="primary" 
                    ghost 
                    size="small"
                    onClick={() => add()} 
                    icon={<PlusOutlined />}
                  >
                    {isMobile ? '' : '添加材料'}
                  </Button>
                </div>
                
                {fields.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px',
                    marginBottom: '16px'
                  }}>
                    暂无材料，请点击上方按钮添加
                  </div>
                )}
                
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <div key={key}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'flex-end',
                        marginBottom: '12px'
                      }}>
                        <Button 
                          type="text" 
                          size="small"
                          onClick={() => remove(name)} 
                          style={{ color: '#ff4d4f' }}
                          icon={<DeleteOutlined />}
                        >
                          删除
                        </Button>
                      </div>
                      <Row gutter={12}>
                        <Col xs={24} sm={16}>
                          <Form.Item
                            {...restField}
                            name={[name, 'product_id']}
                            rules={[{ required: true, message: '请选择材料' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Select 
                              placeholder="选择材料" 
                              style={{ width: '100%' }}
                              showSearch
                              allowClear
                              optionLabelProp="label"
                              filterOption={(input, option) => {
                                const product = products.find(p => p.id === option.value);
                                return product && (
                                  product.name.toLowerCase().includes(input.toLowerCase()) ||
                                  product.id.toLowerCase().includes(input.toLowerCase())
                                );
                              }}
                              getPopupContainer={(triggerNode) => triggerNode.parentElement}
                              onOpenChange={(open) => {
                                if (!open) {
                                  // 强制重新渲染以确保显示正确的label
                                  setTimeout(() => {
                                    editForm.validateFields([[name, 'product_id']]);
                                  }, 0);
                                }
                              }}
                            >
                              {(products || []).filter(product => product && product.id).map((product, index) => (
                                <Select.Option 
                                  key={`edit-${product.id}-${index}`} 
                                  value={String(product.id)}
                                  label={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {product.image_path ? (
                                        <img 
                                          src={`http://localhost:5274/${product.image_path}`} 
                                          alt={product.name}
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
                                      <span>{product.name}</span>
                                    </div>
                                  }
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {product.image_path ? (
                                      <img 
                                        src={`http://localhost:5274/${product.image_path}`} 
                                        alt={product.name}
                                        style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div style={{
                                        width: '32px', height: '32px', background: '#f5f5f5', borderRadius: '4px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                      }}>
                                        <PictureOutlined style={{ color: '#ccc', fontSize: '14px' }} />
                                      </div>
                                    )}
                                    <div>
                                      <div>{product.name}</div>
                                      <div style={{ 
                                        fontSize: '12px', 
                                        color: product.stock_count > 10 ? '#52c41a' : product.stock_count > 0 ? '#faad14' : '#ff4d4f',
                                        fontWeight: '500'
                                      }}>
                                        库存: {product.stock_count}
                                      </div>
                                    </div>
                                  </div>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            rules={[{ required: true, message: '请输入数量' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber 
                              placeholder="数量" 
                              min={1}
                              max={999999}
                              style={{ width: '100%', borderRadius: '6px' }}
                              addonAfter="个"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Space>
              </div>
            )}
          </Form.List>
          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
                setEditProductFileList([]);
              }} disabled={editLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={editLoading} disabled={editLoading}>
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>

      <Modal
        title="删除产品"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingProduct(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setDeleteModalVisible(false);
            setDeletingProduct(null);
          }} disabled={deleteLoading}>
            取消
          </Button>,
          <Button key="delete" type="primary" danger onClick={handleDeleteProduct} loading={deleteLoading} disabled={deleteLoading}>
            确定删除
          </Button>
        ]}
      >
        <Spin spinning={deleteLoading} tip="删除中...">
        {deletingProduct && (
          <div>
            <p>确定要删除以下产品吗？</p>
            <div style={{ padding: '12px', borderRadius: '6px', margin: '12px 0' }}>
              <div>产品编号：{deletingProduct.id}</div>
              <div>产品名称：{deletingProduct.name}</div>
              <div>材料数量：{deletingProduct.materials?.length || 0} 种</div>
            </div>
            <p style={{ color: '#ff4d4f', fontSize: '14px' }}>⚠️ 此操作不可撤销，请谨慎操作！</p>
          </div>
        )}
        </Spin>
      </Modal>
      
      <Modal
        title="批量删除产品"
        open={batchDeleteModalVisible}
        onOk={handleBatchDelete}
        onCancel={() => {
          setBatchDeleteModalVisible(false);
        }}
        okText="确定删除"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: batchDeleteLoading }}
        cancelButtonProps={{ disabled: batchDeleteLoading }}
      >
        <Spin spinning={batchDeleteLoading} tip="删除中...">
        <p>确定要删除以下 {selectedRowKeys.length} 个产品吗？</p>
        <div style={{ padding: '12px', borderRadius: '6px', margin: '12px 0', maxHeight: '200px', overflow: 'auto' }}>
          {selectedRowKeys.map(productId => {
            const product = (productList || []).find(f => f.id === productId);
            return product ? (
              <div key={productId} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '8px',
                padding: '4px'
              }}>
                {product.image_path ? (
                  <img 
                    src={`http://localhost:5274/${product.image_path}`} 
                    alt={product.name}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '24px', height: '24px', background: '#e0e0e0', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <PictureOutlined style={{ color: '#999', fontSize: '12px' }} />
                  </div>
                )}
                <span>{product.name}</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: (product.stock_count || 0) > 0 ? '#ff4d4f' : '#52c41a',
                  marginLeft: '8px'
                }}>
                  (库存{product.stock_count || 0})
                </span>
              </div>
            ) : null;
          })}
        </div>
        <p style={{ color: '#ff4d4f', fontSize: '14px' }}>⚠️ 只有库存数量为0的产品才能删除，此操作不可撤销！</p>
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
        title="产品入库"
        open={inModalVisible}
        onCancel={() => {
          setInModalVisible(false);
          productInForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Spin spinning={inLoading} tip="入库中...">
        <Form form={productInForm} layout="vertical" onFinish={(values) => {
          handleProductIn({ ...values, formula_id: selectedProduct.id });
        }}>
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedProduct?.image_path ? (
                <img 
                  src={`http://localhost:5274/${selectedProduct.image_path}`} 
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PictureOutlined style={{ color: '#ccc' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={selectedProduct?.name}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProduct?.name}</div>
                </Tooltip>
                <div style={{ fontSize: 12 }}>可制作：{selectedProduct?.possible_quantity} | 库存：{selectedProduct?.stock_count || 0}</div>
              </div>
            </div>
          </div>
          <Form.Item name="quantity" label="入库数量" rules={[
            { required: true, message: '请输入数量' },
            {
              validator: (_, value) => {
                if (selectedProduct && value && selectedProduct.possible_quantity < value) {
                  return Promise.reject(new Error(`材料不足，最多可制作 ${selectedProduct.possible_quantity} 个`));
                }
                return Promise.resolve();
              }
            }
          ]}>
            <InputNumber id="product-in-quantity" placeholder="入库数量" min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="customer" label="客户" initialValue={user.username}>
            <Input id="product-in-customer" placeholder="客户（可选）" allowClear />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setInModalVisible(false);
                productInForm.resetFields();
              }} disabled={inLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={inLoading} disabled={inLoading}>
                入库
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>

      <Modal
        title="产品出库"
        open={outModalVisible}
        onCancel={() => {
          setOutModalVisible(false);
          productOutForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Spin spinning={outLoading} tip="出库中...">
        <Form form={productOutForm} layout="vertical" onFinish={(values) => {
          handleProductOut({ ...values, formula_id: selectedProduct.id });
        }}>
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedProduct?.image_path ? (
                <img 
                  src={`http://localhost:5274/${selectedProduct.image_path}`} 
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PictureOutlined style={{ color: '#ccc' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={selectedProduct?.name}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProduct?.name}</div>
                </Tooltip>
                <div style={{ fontSize: 12 }}>库存：{selectedProduct?.stock_count || 0}</div>
              </div>
            </div>
          </div>
          <Form.Item name="quantity" label="出库数量" rules={[
            { required: true, message: '请输入数量' },
            {
              validator: (_, value) => {
                if (selectedProduct && value && (selectedProduct.stock_count || 0) < value) {
                  return Promise.reject(new Error(`库存不足，当前库存 ${selectedProduct.stock_count || 0} 个`));
                }
                return Promise.resolve();
              }
            }
          ]}>
            <InputNumber id="product-out-quantity" placeholder="出库数量" min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="出库价格" initialValue={(() => {
            if (!selectedProduct?.materials || !Array.isArray(selectedProduct.materials) || !products) return 0;
            const materialSellingPrice = selectedProduct.materials.reduce((price, material) => {
              const materialItem = products.find(p => String(p.id) === String(material.product_id));
              if (materialItem && material.required) {
                const outPrice = materialItem.out_price || 0;
                return price + (outPrice * material.required);
              }
              return price;
            }, 0);
            return materialSellingPrice + (selectedProduct.other_price || 0);
          })()} rules={[
            { required: true, message: '请输入出库价格' },
            { type: 'number', min: 0, message: '价格必须大于等于0' }
          ]}>
            <InputNumber id="product-out-price" placeholder="出库价格" min={0} step={0.01} style={{ width: '100%' }} prefix="￥" />
          </Form.Item>
          <Form.Item name="customer" label="客户" initialValue={user.username}>
            <Input id="product-out-customer" placeholder="客户（可选）" allowClear />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setOutModalVisible(false);
                productOutForm.resetFields();
              }} disabled={outLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={outLoading} disabled={outLoading}>
                出库
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>

      <Modal
        title="产品还原"
        open={restoreModalVisible}
        onCancel={() => {
          setRestoreModalVisible(false);
          productRestoreForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Spin spinning={restoreLoading} tip="还原中...">
        <Form form={productRestoreForm} layout="vertical" onFinish={(values) => {
          handleProductRestore({ ...values, formula_id: selectedProduct.id });
        }}>
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: '1px solid #d9d9d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedProduct?.image_path ? (
                <img 
                  src={`http://localhost:5274/${selectedProduct.image_path}`} 
                  alt=""
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 40, height: 40, background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PictureOutlined style={{ color: '#ccc' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={selectedProduct?.name}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProduct?.name}</div>
                </Tooltip>
                <div style={{ fontSize: 12 }}>库存：{selectedProduct?.stock_count || 0}</div>
              </div>
            </div>
          </div>
          <Form.Item name="quantity" label="还原数量" rules={[
            { required: true, message: '请输入数量' },
            {
              validator: (_, value) => {
                if (selectedProduct && value && (selectedProduct.stock_count || 0) < value) {
                  return Promise.reject(new Error(`库存不足，当前库存 ${selectedProduct.stock_count || 0} 个`));
                }
                return Promise.resolve();
              }
            }
          ]}>
            <InputNumber id="product-restore-quantity" placeholder="还原数量" min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="还原原因" rules={[{ required: true, message: '请输入还原原因' }]}>
            <Input id="product-restore-reason" placeholder="还原原因" allowClear />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setRestoreModalVisible(false);
                productRestoreForm.resetFields();
              }} disabled={restoreLoading}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={restoreLoading} disabled={restoreLoading}>
                还原
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </Spin>
      </Modal>
      
      <Modal
        title="产品导入说明"
        open={importHelpVisible}
        onCancel={() => setImportHelpVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportHelpVisible(false)}>
            取消
          </Button>,
          <Button key="download" type="primary" onClick={() => {
            api.downloadProductImportTemplate();
            setImportHelpVisible(false);
          }}>
            下载模板
          </Button>,
          <Button key="import" type="primary" onClick={() => {
            document.getElementById('product-import-input').click();
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
                <li><strong>产品名称：</strong>必填，不能重复，最多100个字符</li>
                <li><strong>成本价：</strong>必填，数字类型</li>
                <li><strong>售价：</strong>必填，数字类型</li>
                <li><strong>其它费用：</strong>可选，默认为0，数字类型</li>
                <li><strong>库存数量：</strong>可选，默认为0，导入后会加到库存中</li>
              </ul>
            </Typography.Paragraph>
          </div>
          
          <div>
            <Typography.Title level={5}>导入步骤：</Typography.Title>
            <Typography.Paragraph>
              <ol style={{ paddingLeft: '20px' }}>
                <li>点击"下载模板"获取Excel模板文件</li>
                <li>在模板中填入产品数据（可参考模板中的示例）</li>
                <li>保存Excel文件</li>
                <li>点击"选择文件导入"上传文件</li>
              </ol>
            </Typography.Paragraph>
          </div>
          
          <div>
            <Typography.Title level={5}>注意事项：</Typography.Title>
            <Typography.Paragraph>
              <ul style={{ paddingLeft: '20px' }}>
                <li>如果产品名称已存在，将更新该产品的信息</li>
                <li>导入不支持图片，请在导入后手动上传产品图片</li>
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
                  <div>共处理 {importResult.total_count} 个产品</div>
                  <div>新增 {importResult.created_count} 个，更新 {importResult.updated_count} 个</div>
                  <div style={{ color: '#faad14', fontSize: '12px' }}>
                    注意：导入不支持图片，请手动上传产品图片
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

export default Product;