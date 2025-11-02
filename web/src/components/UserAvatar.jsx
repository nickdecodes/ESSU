import { useState } from 'react';
import { UserOutlined } from '@ant-design/icons';
import { Avatar, Image } from 'antd';
import { Config } from '../utils/config';
import { useTheme } from '../utils/theme';

const UserAvatar = ({ avatarPath, username, size = 50, preview = true }) => {
  const { darkMode } = useTheme();
  const [imgError, setImgError] = useState(false);
  const borderStyle = { border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}` };
  
  const getAvatarSrc = () => {
    if (!avatarPath || avatarPath.trim() === '') return null;
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    return `${Config.API_BASE_URL}/${avatarPath}`;
  };
  
  const src = getAvatarSrc();
  
  if (!src || imgError) {
    return (
      <Avatar size={size} icon={<UserOutlined />} style={{ fontSize: size === 20 ? '10px' : '20px', ...borderStyle }}>
        {username.charAt(0).toUpperCase()}
      </Avatar>
    );
  }
  
  return (
    <Avatar
      size={size}
      src={
        <Image
          src={src}
          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
          onError={() => setImgError(true)}
          preview={preview ? {
            mask: <div style={{ fontSize: size === 20 ? '8px' : '12px' }}>预览</div>
          } : false}
        />
      }
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: preview ? 'pointer' : 'default', ...borderStyle }}
    />
  );
};

export default UserAvatar;
