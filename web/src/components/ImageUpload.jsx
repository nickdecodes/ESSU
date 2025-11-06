import { LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Space, Typography, Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import { useState } from 'react';
import { Config } from '../utils/config';

const ImageUpload = ({ fileList, onChange, text = '上传图片' }) => {
  const [urlInput, setUrlInput] = useState('');
  const [inputMode, setInputMode] = useState('upload');

  const handleBeforeUpload = (file) => {
    const newFile = {
      uid: file.uid || '-1',
      name: file.name,
      status: 'done',
      originFileObj: file,
      thumbUrl: URL.createObjectURL(file)
    };
    onChange({ fileList: [newFile] });
    return false;
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    const newFile = {
      uid: '-1',
      name: 'image-from-url',
      status: 'done',
      url: urlInput.trim(),
      thumbUrl: urlInput.trim()
    };
    onChange({ fileList: [newFile] });
    setUrlInput('');
  };

  const handleRemove = () => {
    onChange({ fileList: [] });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <Button 
          type={inputMode === 'upload' ? 'primary' : 'default'} 
          size="small" 
          onClick={() => setInputMode('upload')}
        >
          本地文件
        </Button>
        <Button 
          type={inputMode === 'url' ? 'primary' : 'default'} 
          size="small" 
          icon={<LinkOutlined />}
          onClick={() => setInputMode('url')}
        >
          网络链接
        </Button>
      </Space>
      
      {inputMode === 'url' && fileList.length === 0 && (
        <Input.Search
          placeholder="输入图片链接地址 (http://... 或 https://...)"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onSearch={handleUrlSubmit}
          enterButton="确定"
        />
      )}
      
      <Flex justify="center">
        <ImgCrop 
          rotationSlider 
          aspectSlider 
          showReset
          quality={1}
          modalProps={{ okText: '确定', cancelText: '取消', width: 800, centered: true }}
        >
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={handleBeforeUpload}
            onRemove={handleRemove}
            maxCount={1}
            accept="image/*"
          >
            {fileList.length === 0 && inputMode === 'upload' && (
              <Flex vertical align="center">
                <PlusOutlined />
                <Typography.Text style={{ marginTop: 8 }}>{text}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 10, marginTop: 4 }}>
                  支持 {Config.ALLOWED_EXTENSIONS_TEXT}
                </Typography.Text>
              </Flex>
            )}
          </Upload>
        </ImgCrop>
      </Flex>
    </Space>
  );
};

export default ImageUpload;
