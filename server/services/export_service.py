# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: export_service.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import pandas as pd
import os
from utils.timezone_utils import format_china_time, china_now
from dbs.db_manager import DBManager
from dbs.models import Material, Product, User, OperationRecord
import json

class ExportService:
    """导出服务 - 负责数据导出功能"""
    
    def __init__(self):
        from config import Config
        self.db = DBManager()
        self.export_dir = Config.EXPORT_FOLDER
    
    def export_materials(self):
        """导出材料数据"""
        session = self.db.get_session()
        try:
            materials = session.query(Material).order_by(Material.id).all()
            
            data = []
            for m in materials:
                data.append({
                    'ID': m.id,
                    '材料名称': m.name,
                    '售价': m.price,
                    '成本价': m.cost_price,
                    '库存': m.stock,
                    '图片路径': m.image_path or '',
                    '创建时间': format_china_time(m.created_at),
                    '更新时间': format_china_time(m.updated_at)
                })
            
            df = pd.DataFrame(data)
            filename = f'materials_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(self.export_dir, filename)
            df.to_excel(filepath, index=False)
            return filepath
        finally:
            self.db.close_session(session)
    
    def export_products(self):
        """导出配方数据"""
        session = self.db.get_session()
        try:
            products = session.query(Product).order_by(Product.id).all()
            
            data = []
            for formula in products:
                materials_dict = json.loads(formula.materials)
                materials_str = ', '.join([f'{k}:{v}' for k, v in materials_dict.items()])
                
                data.append({
                    'ID': formula.id,
                    '产品名称': formula.name,
                    '材料清单': materials_str,
                    '图片路径': formula.image_path or '',
                    '库存数量': formula.stock_count or 0,
                    '创建时间': format_china_time(formula.created_at),
                    '更新时间': format_china_time(formula.updated_at)
                })
            
            df = pd.DataFrame(data)
            filename = f'formulas_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(self.export_dir, filename)
            df.to_excel(filepath, index=False)
            return filepath
        finally:
            self.db.close_session(session)
    
    def export_users(self):
        """导出用户数据"""
        session = self.db.get_session()
        try:
            users = session.query(User).order_by(User.id).all()
            
            data = []
            for u in users:
                data.append({
                    'ID': u.id,
                    '用户名': u.username,
                    '角色': u.role,
                    '头像路径': u.avatar_path or '',
                    '创建时间': format_china_time(u.created_at),
                    '更新时间': format_china_time(u.updated_at)
                })
            
            df = pd.DataFrame(data)
            filename = f'users_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(self.export_dir, filename)
            df.to_excel(filepath, index=False)
            return filepath
        finally:
            self.db.close_session(session)
    
    def export_operation_records(self):
        """导出操作记录"""
        session = self.db.get_session()
        try:
            records = session.query(OperationRecord).order_by(OperationRecord.created_at.desc()).all()
            
            data = []
            for r in records:
                data.append({
                    '操作类型': r.operation_type,
                    '产品ID': r.product_id or '',
                    '产品名称': r.product_name or '',
                    '数量': r.quantity or 0,
                    '详情': r.detail or '',
                    '操作用户': r.username or '',
                    '操作时间': format_china_time(r.created_at)
                })
            
            df = pd.DataFrame(data)
            filename = f'operation_records_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(self.export_dir, filename)
            df.to_excel(filepath, index=False)
            return filepath
        finally:
            self.db.close_session(session)
    
    def export_operation_records_filtered(self, filters: dict):
        """根据筛选条件导出操作记录"""
        from services.record_service import RecordService
        record_service = RecordService()
        
        session = self.db.get_session()
        try:
            # 使用记录服务的筛选方法获取所有符合条件的记录
            records, _ = record_service.get_records_filtered(0, 999999, filters)
            
            data = []
            for r in records:
                data.append({
                    '操作时间': r['created_at'],
                    '操作类型': r['operation_type'],
                    '操作详情': r['detail'] or '',
                    '操作用户': r['username'] or ''
                })
            
            df = pd.DataFrame(data)
            filename = f'operation_records_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(self.export_dir, filename)
            df.to_excel(filepath, index=False)
            
            # 如果需要删除原数据
            if filters.get('delete_after_export', False):
                # 这里可以实现删除逻辑，但需要谨慎
                pass
            
            return filepath
        finally:
            self.db.close_session(session)
    
    def export_all(self):
        """导出所有数据到一个Excel文件"""
        filename = f'essu_all_data_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        filepath = os.path.join(self.export_dir, filename)
        
        session = self.db.get_session()
        try:
            with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
                # 材料数据
                materials = session.query(Material).order_by(Material.id).all()
                material_data = []
                for m in materials:
                    material_data.append({
                        'ID': m.id,
                        '材料名称': m.name,
                        '售价': m.price,
                        '成本价': m.cost_price,
                        '库存': m.stock,
                        '图片路径': m.image_path or '',
                        '创建时间': format_china_time(m.created_at),
                        '更新时间': format_china_time(m.updated_at)
                    })
                df_materials = pd.DataFrame(material_data)
                df_materials.to_excel(writer, sheet_name='材料', index=False)
                
                # 配方数据
                formulas = session.query(Formula).order_by(Formula.id).all()
                formula_data = []
                for formula in formulas:
                    materials_dict = json.loads(formula.materials)
                    materials_str = ', '.join([f'{k}:{v}' for k, v in materials_dict.items()])
                    
                    formula_data.append({
                        'ID': formula.id,
                        '配方名称': formula.name,
                        '材料配比': materials_str,
                        '图片路径': formula.image_path or '',
                        '已生产数量': formula.produced_quantity or 0,
                        '创建时间': format_china_time(formula.created_at),
                        '更新时间': format_china_time(formula.updated_at)
                    })
                
                df_formulas = pd.DataFrame(formula_data)
                df_formulas.to_excel(writer, sheet_name='配方', index=False)
                
                # 用户数据
                users = session.query(User).order_by(User.id).all()
                user_data = []
                for u in users:
                    user_data.append({
                        'ID': u.id,
                        '用户名': u.username,
                        '角色': u.role,
                        '头像路径': u.avatar_path or '',
                        '创建时间': format_china_time(u.created_at),
                        '更新时间': format_china_time(u.updated_at)
                    })
                df_users = pd.DataFrame(user_data)
                df_users.to_excel(writer, sheet_name='用户', index=False)
                
                # 操作记录（限制1000条）
                records = session.query(OperationRecord).order_by(OperationRecord.created_at.desc()).limit(1000).all()
                record_data = []
                for r in records:
                    record_data.append({
                        '操作类型': r.operation_type,
                        '产品ID': r.product_id or '',
                        '产品名称': r.product_name or '',
                        '数量': r.quantity or 0,
                        '详情': r.detail or '',
                        '操作用户': r.username or '',
                        '操作时间': format_china_time(r.created_at)
                    })
                df_records = pd.DataFrame(record_data)
                df_records.to_excel(writer, sheet_name='操作记录', index=False)
            
            return filepath
        finally:
            self.db.close_session(session)