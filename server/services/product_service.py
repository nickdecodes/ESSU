#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: product_service.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

from dbs.db_manager import DBManager
from dbs.models import Product, Material, OperationRecord
from services.material_service import MaterialService
from utils.timezone_utils import china_now, format_china_time
import json
import logging

class ProductService:
    """产品服务 - 负责产品配方管理和生产操作"""
    
    def __init__(self):
        self.db = DBManager()
        self.material_service = MaterialService()
        self.logger = logging.getLogger(__name__)
    
    def add_product(self, name: str, materials: dict, in_price: float = 0, out_price: float = 0, manual_price: float = 0, username: str = '', image_path: str = None) -> dict:
        """添加产品"""
        session = self.db.get_session()
        try:
            materials_json = json.dumps(materials)
            
            # 创建产品对象
            product = Product(
                name=name,
                materials=materials_json,
                in_price=in_price,
                out_price=out_price,
                manual_price=manual_price,
                image_path=image_path
            )
            
            session.add(product)
            session.flush()  # 获取ID但不提交
            
            # 记录添加操作
            operation = OperationRecord(
                operation_type='添加产品',
                name=name,
                quantity=0,
                detail=f'添加产品: {name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                return {'success': True, 'product_id': product.id}
            else:
                return {'success': False}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品添加异常: {name} - {str(e)}', exc_info=True)
            return {'success': False}
        finally:
            self.db.close_session(session)
    
    def _process_products(self, products):
        """处理配方数据，计算可制作数量"""
        materials = {str(m['id']): m for m in self.material_service.get_all_materials()}
        
        result = []
        for product in products:
            # 解析材料JSON字符串
            try:
                product_materials = json.loads(product.materials)
            except:
                product_materials = {}
            
            # 计算可制作数量
            possible_quantity = float('inf')
            materials_with_stock = []
            
            for material_id, required_qty in product_materials.items():
                material = materials.get(material_id)
                if material:
                    stock_count = material['stock_count']
                    materials_with_stock.append({
                        'product_id': material_id,
                        'name': material['name'],
                        'required': required_qty,
                        'stock_count': stock_count
                    })
                    if required_qty > 0:
                        possible_quantity = min(possible_quantity, stock_count // required_qty)
                else:
                    materials_with_stock.append({
                        'product_id': material_id,
                        'name': material_id,
                        'required': required_qty,
                        'stock_count': 0
                    })
                    possible_quantity = 0
            
            result.append({
                'id': product.id,
                'name': product.name,
                'materials': materials_with_stock,
                'in_price': product.in_price,
                'out_price': product.out_price,
                'manual_price': product.manual_price or 0,
                'image_path': product.image_path,
                'stock_count': product.stock_count or 0,
                'possible_quantity': int(possible_quantity) if possible_quantity != float('inf') else 0,
                'created_at': format_china_time(product.created_at),
                'updated_at': format_china_time(product.updated_at)
            })
        
        return result
    
    def get_all_products(self):
        """获取所有配方并计算可制作数量"""
        session = self.db.get_session()
        try:
            products = session.query(Product).order_by(Product.id).all()
            return self._process_products(products)
        finally:
            self.db.close_session(session)
    
    def get_products_paginated(self, offset: int, limit: int):
        """分页获取产品"""
        session = self.db.get_session()
        try:
            products = session.query(Product).order_by(Product.id).offset(offset).limit(limit).all()
            return self._process_products(products)
        finally:
            self.db.close_session(session)
    
    def get_product_category(self) -> int:
        """获取产品种类"""
        session = self.db.get_session()
        try:
            return session.query(Product).count()
        finally:
            self.db.close_session(session)

    def get_products_count(self) -> int:
        """获取产品总数"""
        session = self.db.get_session()
        try:
            products = session.query(Product).all()
            total_count = 0
            for product in products:
                total_count += product.stock_count or 0
            return total_count
        finally:
            self.db.close_session(session)
    
    def calculate_possible_stock(self, product_id: int) -> int:
        """计算产品可制作库存"""
        session = self.db.get_session()
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                return 0
            
            materials = json.loads(product.materials)
            possible_stock = float('inf')
            
            for material_id, required_qty in materials.items():
                material = session.query(Material).filter(Material.id == int(material_id)).first()
                stock_count = material.stock_count if material else 0
                if required_qty > 0:
                    possible_stock = min(possible_stock, stock_count // required_qty)
                else:
                    possible_stock = 0
            
            return int(possible_stock) if possible_stock != float('inf') else 0
        finally:
            self.db.close_session(session)

    def delete_product(self, product_id: int, username: str = '') -> dict:
        """删除产品"""
        self.logger.info(f'开始删除产品: {product_id}, 用户: {username}')
        
        session = self.db.get_session()
        try:
            # 获取产品信息
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                self.logger.warning(f'产品删除失败: 产品不存在 - {product_id}')
                return {'success': False, 'message': '产品不存在'}
            
            product_name = product.name
            stock_count = product.stock_count
            
            # 检查已制作数量
            if stock_count > 0:
                return {'success': False, 'message': f'产品 {product_name} 已制作数量不为零（{stock_count}个），请先出库或还原后再删除'}
            
            # 删除配方
            session.delete(product)
            
            # 记录删除操作
            operation = OperationRecord(
                operation_type='删除产品',
                name=product_name,
                quantity=0,
                detail=f'删除产品: {product_name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'产品删除成功: {product_id} - {product_name}')
                return {'success': True}
            else:
                return {'success': False, 'message': '删除失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品删除异常: {product_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '删除失败'}
        finally:
            self.db.close_session(session)
    
    def batch_delete_products(self, product_ids: list, username: str = '') -> dict:
        """批量删除产品"""
        try:
            failed_products = []
            deleted_count = 0
            
            for product_id in product_ids:
                result = self.delete_product(product_id, username)
                if result['success']:
                    deleted_count += 1
                else:
                    failed_products.append({
                        'id': product_id,
                        'message': result['message']
                    })
            
            if failed_products:
                failed_list = []
                for failed in failed_products:
                    # 获取产品名称和失败原因
                    session = self.db.get_session()
                    try:
                        product = session.query(Product).filter(Product.id == failed['id']).first()
                        if product:
                            failed_list.append({
                                'name': product.name,
                                'reason': failed['message']
                            })
                    finally:
                        self.db.close_session(session)
                
                return {
                    'success': False,
                    'deleted_count': deleted_count,
                    'failed_products': failed_list,
                    'should_close': deleted_count > 0
                }
            else:
                return {'success': True, 'message': f'成功删除 {deleted_count} 个产品'}
        except Exception as e:
            return {'success': False, 'message': '批量删除失败'}

    def update_product(self, product_id: int, name: str, materials: dict = None, in_price: float = None, out_price: float = None, manual_price: float = None, username: str = '', image_path: str = None) -> bool:
        """更新产品"""
        session = self.db.get_session()
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                return False
            
            # 更新字段
            product.name = name
            if materials is not None:
                product.materials = json.dumps(materials)
            if in_price is not None:
                product.in_price = in_price
            if out_price is not None:
                product.out_price = out_price
            if manual_price is not None:
                product.manual_price = manual_price
            if image_path is not None:
                product.image_path = image_path
            
            # 记录更新操作
            operation = OperationRecord(
                operation_type='更新产品',
                name=name,
                quantity=0,
                detail=f'更新产品: {name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'产品更新成功: {product_id} - {name}')
                return True
            else:
                return False
            
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品更新异常: {product_id} - {str(e)}', exc_info=True)
            return False
        finally:
            self.db.close_session(session)
    
    def inbound(self, product_id: int, quantity: int, customer: str = '', username: str = '') -> bool:
        """入库产品"""
        self.logger.info(f'开始产品入库: {product_id}, 数量: {quantity}, 用户: {username}')

        session = self.db.get_session()
        try:
            # 获取产品
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                return False
            
            product_name = product.name
            materials = json.loads(product.materials)
            
            # 检查材料是否足够
            for material_id, required_qty in materials.items():
                material = session.query(Material).filter(Material.id == int(material_id)).first()
                if not material or material.stock_count < required_qty * quantity:
                    return False
            
            # 消耗材料
            for material_id, required_qty in materials.items():
                material = session.query(Material).filter(Material.id == int(material_id)).first()
                material.stock_count -= required_qty * quantity
            
            # 增加配方的制作数量
            product.stock_count = (product.stock_count or 0) + quantity
            
            # 记录操作
            detail = f'客户: {customer}, 产品制作数量: +{quantity}' if customer else f'产品制作数量: +{quantity}'
            operation = OperationRecord(
                operation_type='产品入库',
                name=product_name,
                quantity=quantity,
                detail=detail,
                username=username
            )
            session.add(operation)
            
            return self.db.commit_session(session)
            
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品入库失败: {product_id} - {str(e)}', exc_info=True)
            return False
        finally:
            self.db.close_session(session)
    
    def outbound(self, product_id: int, quantity: int, customer: str = '', username: str = '') -> dict:
        """出库产品"""
        self.logger.info(f'开始产品出库: {product_id}, 数量: {quantity}, 用户: {username}')
        
        session = self.db.get_session()
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                return {'success': False, 'message': '产品不存在'}
            
            product_name = product.name
            stock_count = product.stock_count or 0
            if stock_count < quantity:
                return {'success': False, 'message': f'产品库存不足，当前: {stock_count}'}
            
            # 更新产品库存
            product.stock_count = stock_count - quantity
            
            # 记录操作
            operation = OperationRecord(
                operation_type='产品出库',
                name=product_name,
                quantity=-quantity,
                detail=f'客户: {customer}, 数量: -{quantity}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                return {'success': True}
            else:
                return {'success': False, 'message': '出库失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'出库产品异常: {product_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '出库失败'}
        finally:
            self.db.close_session(session)
    
    def restore(self, product_id: int, quantity: int, reason: str = '', username: str = '') -> bool:
        """产品还原"""
        session = self.db.get_session()
        try:
            # 获取产品库存
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product or (product.stock_count or 0) < quantity:
                return False
            
            product_name = product.name
            materials = json.loads(product.materials)
            
            # 还原材料
            for material_id, required_qty in materials.items():
                material = session.query(Material).filter(Material.id == int(material_id)).first()
                if material:
                    material.stock_count += required_qty * quantity
            
            # 更新产品库存
            product.stock_count = (product.stock_count or 0) - quantity
            
            # 记录操作
            detail = f'还原数量: -{quantity}, 原因: {reason}' if reason else f'还原数量: -{quantity}'
            operation = OperationRecord(
                operation_type='产品还原',
                name=product_name,
                quantity=-quantity,
                detail=detail,
                username=username
            )
            session.add(operation)
            
            return self.db.commit_session(session)
            
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品还原失败: {product_id} - {str(e)}', exc_info=True)
            return False
        finally:
            self.db.close_session(session)

    def get_stock(self, product_id: int) -> int:
        """获取产品库存"""
        session = self.db.get_session()
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            return product.stock_count if product else 0
        finally:
            self.db.close_session(session)
    
    def import_from_excel(self, file, username: str = '') -> dict:
        """从Excel导入产品（简化版，不包含材料配方）"""
        return {'success': False, 'message': '产品导入功能暂不支持，请手动添加'}
    
    def export_to_excel(self, product_ids: list = None):
        """导出产品到Excel
        
        Args:
            product_ids: 要导出的产品ID列表，如果为空则导出所有产品
        """
        import openpyxl
        from flask import send_file
        from io import BytesIO
        from datetime import datetime
        from PIL import Image
        from openpyxl.drawing.image import Image as XLImage
        from config import Config
        import os
        
        try:
            # 创建工作簿
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = '产品列表'
            
            # 设置列宽和行高
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 15
            ws.column_dimensions['C'].width = 12
            ws.column_dimensions['D'].width = 12
            ws.column_dimensions['E'].width = 12
            ws.column_dimensions['F'].width = 12
            ws.column_dimensions['G'].width = 15
            ws.column_dimensions['H'].width = 20
            ws.column_dimensions['I'].width = 20
            
            # 写入表头
            headers = ['图片', '产品名称', '成本价', '售价', '手工费', '库存数量', '可制作数量', '创建时间', '更新时间']
            ws.append(headers)
            
            # 从数据库查询产品
            session = self.db.get_session()
            try:
                query = session.query(Product).order_by(Product.id)
                
                # 如果有筛选条件，只导出筛选后的产品
                if product_ids:
                    query = query.filter(Product.id.in_(product_ids))
                
                products = query.all()
                processed_products = self._process_products(products)
                
                row_idx = 2
                for product in processed_products:
                    # 写入数据
                    ws.append([
                        '',
                        product['name'],
                        product['in_price'],
                        product['out_price'],
                        product['manual_price'],
                        product['stock_count'],
                        product['possible_quantity'],
                        product['created_at'],
                        product['updated_at']
                    ])
                    
                    # 设置行高
                    ws.row_dimensions[row_idx].height = 50
                    
                    # 插入图片
                    if product.get('image_path'):
                        try:
                            image_path = product['image_path']
                            if image_path.startswith(('http://', 'https://')):
                                ws[f'A{row_idx}'] = image_path
                            else:
                                image_file = os.path.join(Config.UPLOAD_FOLDER, os.path.basename(image_path))
                                if os.path.exists(image_file):
                                    img = Image.open(image_file)
                                    img.thumbnail((50, 50))
                                    
                                    img_buffer = BytesIO()
                                    img.save(img_buffer, format='PNG')
                                    img_buffer.seek(0)
                                    
                                    xl_img = XLImage(img_buffer)
                                    xl_img.width = 50
                                    xl_img.height = 50
                                    ws.add_image(xl_img, f'A{row_idx}')
                        except Exception as e:
                            self.logger.warning(f'插入图片失败: {product["name"]} - {str(e)}')
                    
                    row_idx += 1
            finally:
                self.db.close_session(session)
            
            # 保存到内存
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
            # 生成文件名
            filename = f'products_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=filename
            )
            
        except Exception as e:
            self.logger.error(f'导出Excel失败: {str(e)}', exc_info=True)
            from flask import jsonify
            return jsonify({'success': False, 'message': f'导出失败: {str(e)}'}), 500
    