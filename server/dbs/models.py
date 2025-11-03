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

from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from utils.timezone_utils import china_now


Base = declarative_base()


class User(Base):
    """用户模型"""
    __tablename__ = 'user'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    password = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    avatar_path = Column(String(255))
    sessions = Column(Text)  # JSON格式存储会话信息 {session_id: timestamp}
    created_at = Column(DateTime, default=china_now)
    updated_at = Column(DateTime, default=china_now, onupdate=china_now)


class Material(Base):
    """材料模型"""
    __tablename__ = 'material'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    in_price = Column(Float, nullable=False, default=0)
    out_price = Column(Float, nullable=False, default=0)
    stock_count = Column(Integer, default=0)
    used_by_products = Column(Text, default='[]')  # JSON格式存储产品ID列表
    image_path = Column(String(255))
    created_at = Column(DateTime, default=china_now)
    updated_at = Column(DateTime, default=china_now, onupdate=china_now)


class Product(Base):
    """产品模型（原配方模型）"""
    __tablename__ = 'product'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    materials = Column(Text, nullable=False)  # JSON格式存储材料信息
    in_price = Column(Float, nullable=False, default=0)
    out_price = Column(Float, nullable=False, default=0)
    manual_price = Column(Float, nullable=False, default=0)
    stock_count = Column(Integer, default=0)
    image_path = Column(String(255))
    created_at = Column(DateTime, default=china_now)
    updated_at = Column(DateTime, default=china_now, onupdate=china_now)


class OperationRecord(Base):
    """操作记录模型"""
    __tablename__ = 'operation_record'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    quantity = Column(Integer, default=0)
    detail = Column(String(500))
    username = Column(String(50))
    created_at = Column(DateTime, default=china_now)
    operation_type = Column(String(50), nullable=False)