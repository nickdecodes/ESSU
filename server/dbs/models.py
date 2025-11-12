#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: models.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from utils.timezone_utils import china_now

Base = declarative_base()


class User(Base):
    """
    用户模型
    
    Attributes:
        id: 用户ID
        username: 用户名，唯一
        password: 密码
        role: 角色 (admin/user)
        avatar_path: 头像路径
        sessions: 会话信息 (JSON)
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = 'user'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True, index=True)
    password = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, index=True)
    avatar_path = Column(String(255))
    sessions = Column(Text)
    created_at = Column(DateTime, default=china_now, index=True)
    updated_at = Column(DateTime, default=china_now, onupdate=china_now)


class Material(Base):
    """
    材料模型
    
    Attributes:
        id: 材料ID
        name: 材料名称，唯一
        in_price: 进价
        out_price: 售价
        stock_count: 库存数量
        used_by_products: 使用该材料的产品数量
        image_path: 图片路径
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = 'material'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    in_price = Column(Float, nullable=False, default=0)
    out_price = Column(Float, nullable=False, default=0)
    stock_count = Column(Integer, default=0, index=True)
    used_by_products = Column(Text, default='[]')
    image_path = Column(String(255))
    created_at = Column(DateTime, default=china_now, index=True)
    updated_at = Column(DateTime, default=china_now, onupdate=china_now)


class Product(Base):
    """
    产品模型
    
    Attributes:
        id: 产品ID
        name: 产品名称，唯一
        materials: 材料信息 (JSON)
        in_price: 成本价
        out_price: 售价
        other_price: 其他费用
        stock_count: 库存数量
        image_path: 图片路径
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = 'product'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    materials = Column(Text, nullable=False)
    in_price = Column(Float, nullable=False, default=0)
    out_price = Column(Float, nullable=False, default=0)
    other_price = Column(Float, nullable=False, default=0)
    stock_count = Column(Integer, default=0, index=True)
    image_path = Column(String(255))
    created_at = Column(DateTime, default=china_now, index=True)
    updated_at = Column(DateTime, default=china_now, onupdate=china_now)


class OperationRecord(Base):
    """
    操作记录模型
    
    Attributes:
        id: 记录ID
        operation_type: 操作类型
        name: 操作对象名称
        quantity: 数量
        detail: 详细信息
        username: 操作用户
        created_at: 创建时间
    """
    __tablename__ = 'operation_record'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    operation_type = Column(String(50), nullable=False, index=True)
    name = Column(String(100), index=True)
    quantity = Column(Integer, default=0)
    detail = Column(String(500))
    username = Column(String(50), index=True)
    created_at = Column(DateTime, default=china_now, index=True)