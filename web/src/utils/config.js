// 前端配置文件 - 与后端config.py保持同步
export const Config = {
  // 文件上传配置
  ALLOWED_EXTENSIONS: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
  ALLOWED_EXTENSIONS_TEXT: 'PNG/JPG/JPEG\nGIF/WEBP/SVG',
  MAX_FILE_SIZE_MB: 16,
  
  // 业务规则配置
  MAX_NAME_LENGTH: 100,
  MAX_USERNAME_LENGTH: 50,
  MAX_PASSWORD_LENGTH: 100,
  MAX_SUPPLIER_LENGTH: 100,
  MAX_CUSTOMER_LENGTH: 100,
  MAX_DETAIL_LENGTH: 500,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 999999,
  
  // 分页配置
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_RECORDS_PAGE_SIZE: 200,
  
  // 用户会话配置
  MAX_CONCURRENT_SESSIONS: 3,
  SESSION_TIMEOUT: 24 * 60 * 60, // 24小时（秒）
  
  // 用户角色
  ADMIN_ROLE: 'admin',
  USER_ROLE: 'user',
  VALID_ROLES: ['admin', 'user'],
  
  // API配置
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5274',
  
  // 会话检查配置
  SESSION_CHECK_INTERVAL: 30 * 60 * 1000, // 30分钟（毫秒）
  
  // 默认标签页
  DEFAULT_TAB: 'home',
  
  // 本地存储键名
  STORAGE_KEYS: {
    CURRENT_TAB: 'currentTab',
    USER: 'user',
    SESSION_ID: 'session_id'
  }
};