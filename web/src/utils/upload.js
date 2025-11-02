import { Config } from './config';

/**
 * 上传图片到服务器
 * @param {File} file - 要上传的文件
 * @param {string} fieldName - 表单字段名（如 'image', 'avatar'）
 * @param {string} endpoint - 上传端点（如 '/materials', '/users/username'）
 * @param {string} method - HTTP 方法（'POST' 或 'PUT'）
 * @param {Object} additionalData - 额外的表单数据
 * @returns {Promise<Object>} 服务器响应
 */
export const uploadWithImage = async (file, fieldName, endpoint, method = 'POST', additionalData = {}) => {
  const formData = new FormData();
  Object.entries(additionalData).forEach(([k, v]) => formData.append(k, v));
  formData.append(fieldName, file);
  
  const res = await fetch(`${Config.API_BASE_URL}${endpoint}`, { method, body: formData });
  return { data: await res.json() };
};

/**
 * 从文件列表中获取图片路径
 * @param {Array} fileList - 文件列表
 * @param {string} pathKey - 响应中的路径键名（如 'image_path', 'avatar_path'）
 * @param {string} currentPath - 当前路径（编辑时使用）
 * @returns {string|null} 图片路径
 */
export const getImagePath = (fileList, pathKey = 'image_path', currentPath = null) => {
  if (!fileList || fileList.length === 0) return null;
  const file = fileList[0];
  if (file.response?.[pathKey]) return file.response[pathKey];
  if (file.url) return currentPath;
  return null;
};
