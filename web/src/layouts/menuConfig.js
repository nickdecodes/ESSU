import React from 'react';
import {
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  EyeOutlined,
  ProductOutlined,
  TeamOutlined
} from '@ant-design/icons';

const MENU_ITEMS = [
  { key: 'home', icon: React.createElement(DashboardOutlined), label: '控制中心' },
  { key: 'material', icon: React.createElement(ExperimentOutlined), label: '材料管理' },
  { key: 'product', icon: React.createElement(ProductOutlined), label: '产品管理' },
  { key: 'statistics', icon: React.createElement(BarChartOutlined), label: '数据统计' },
  { key: 'records', icon: React.createElement(EyeOutlined), label: '操作记录', adminOnly: true },
  { key: 'user', icon: React.createElement(TeamOutlined), label: '用户管理', adminOnly: true }
];

export function menuConfig(userRole) {
  return MENU_ITEMS.filter(item => !item.adminOnly || userRole === 'admin');
}