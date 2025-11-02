import { useState } from 'react';
import { api } from './api';

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.session_id) localStorage.setItem('session_id', userData.session_id);
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await api.logout(user.username, localStorage.getItem('session_id'));
      } catch (error) {
        console.error('登出记录失败:', error);
      }
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('session_id');
  };

  return { user, handleLogin, handleLogout };
};

const useDataLoader = (apiMethod, errorMsg) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async (onError) => {
    setLoading(true);
    try {
      const res = await apiMethod();
      setData(res.data.data || res.data);
    } catch (error) {
      console.error(errorMsg, error);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, loadData, setData };
};

export const useMaterials = () => {
  const { data: materials, loading, loadData, setData } = useDataLoader(api.getAllMaterials, '加载材料失败');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8, total: 0 });

  const loadMaterials = async (onError) => {
    await loadData(onError);
  };

  return { materials, filteredMaterials, setFilteredMaterials, loading, loadMaterials, pagination, setPagination };
};

export const useProducts = () => {
  const { data: products, loading, loadData: loadProducts } = useDataLoader(api.getAllProducts, '加载产品失败');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8, total: 0 });

  return { products, loading, loadProducts, pagination, setPagination };
};

export const useUsers = () => {
  const { data: users, loadData: loadUsers } = useDataLoader(api.getUsers, '加载用户列表失败');
  return { users, loadUsers };
};