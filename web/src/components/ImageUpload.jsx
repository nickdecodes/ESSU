import { PlusOutlined } from '@ant-design/icons';
import { Flex, Typography, Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import { Config } from '../utils/config';

const ImageUpload = ({ fileList, onChange, text = '上传图片' }) => {
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

  const handleRemove = () => {
    onChange({ fileList: [] });
  };

  return (
    <Flex justify="center">
      <ImgCrop 
        rotationSlider 
        aspectSlider 
        showReset
        quality={1}
        modalProps={{ okText: '确定', cancelText: '取消' }}
      >
        <Upload
          listType="picture-card"
          fileList={fileList}
          beforeUpload={handleBeforeUpload}
          onRemove={handleRemove}
          maxCount={1}
          accept="image/*"
        >
          {fileList.length === 0 && (
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
  );
};

export default ImageUpload;
