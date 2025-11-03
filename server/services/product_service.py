#!/usr/bin/env python
# -*- coding: utf-8 -*-

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
    
    def _parse_used_list(self, used_by_products_str: str) -> list:
        """解析used_by_products JSON字符串"""
        try:
            return json.loads(used_by_products_str or '[]')
        except (json.JSONDecodeError, TypeError):
            self.logger.warning(f'解析used_by_products失败: {used_by_products_str}')
            return []
    
    def _serialize_used_list(self, used_list: list) -> str:
        """序列化used_by_products列表"""
        return json.dumps(used_list)
    
    def _validate_materials(self, session, materials: dict) -> tuple:
        """验证材料是否存在，返回(是否有效, 错误信息, 材料对象字典)"""
        if not materials:
            return False, '产品必须包含至少一个材料', {}
        
        material_objs = {}
        for material_id_str in materials.keys():
            try:
                material_id = int(material_id_str)
                material = session.query(Material).filter(Material.id == material_id).first()
                if not material:
                    return False, f'材料ID {material_id} 不存在', {}
                material_objs[material_id_str] = material
            except (ValueError, TypeError):
                return False, f'无效的材料ID: {material_id_str}', {}
        
        return True, '', material_objs
    
    def _update_material_references(self, session, product_id: int, old_materials: dict, new_materials: dict):
        """批量更新材料引用，返回是否成功"""
        try:
            old_ids = set(old_materials.keys())
            new_ids = set(new_materials.keys())
            
            removed_ids = old_ids - new_ids
            added_ids = new_ids - old_ids
            
            for material_id_str in removed_ids:
                material = session.query(Material).filter(Material.id == int(material_id_str)).first()
                if material:
                    used_list = self._parse_used_list(material.used_by_products)
                    if product_id in used_list:
                        used_list.remove(product_id)
                        material.used_by_products = self._serialize_used_list(used_list)
                        self.logger.debug(f'移除产品{product_id}从材料{material_id_str}的引用列表')
            
            for material_id_str in added_ids:
                material = session.query(Material).filter(Material.id == int(material_id_str)).first()
                if material:
                    used_list = self._parse_used_list(material.used_by_products)
                    if product_id not in used_list:
                        used_list.append(product_id)
                        material.used_by_products = self._serialize_used_list(used_list)
                        self.logger.debug(f'添加产品{product_id}到材料{material_id_str}的引用列表')
            
            return True
        except Exception as e:
            self.logger.error(f'更新材料引用失败: {str(e)}', exc_info=True)
            return False
    
    def add_product(self, name: str, materials: dict, in_price: float = 0, out_price: float = 0, manual_price: float = 0, username: str = '', image_path: str = None) -> dict:
        """添加产品"""
        session = self.db.get_session()
        try:
            self.logger.info(f'开始添加产品: {name}, 材料数: {len(materials)}, 用户: {username}')
            
            valid, error_msg, material_objs = self._validate_materials(session, materials)
            if not valid:
                self.logger.warning(f'产品添加验证失败: {error_msg}')
                return {'success': False, 'message': error_msg}
            
            calculated_in_price = 0
            for material_id_str, required_qty in materials.items():
                material = material_objs.get(material_id_str)
                if material:
                    calculated_in_price += (material.in_price or 0) * required_qty
            
            manual_price = manual_price or 0
            calculated_out_price = calculated_in_price + manual_price
            
            materials_json = json.dumps(materials)
            product = Product(
                name=name,
                materials=materials_json,
                in_price=calculated_in_price,
                out_price=calculated_out_price,
                manual_price=manual_price,
                image_path=image_path
            )
            
            session.add(product)
            session.flush()
            
            for material_id_str, material in material_objs.items():
                used_list = self._parse_used_list(material.used_by_products)
                if product.id not in used_list:
                    used_list.append(product.id)
                    material.used_by_products = self._serialize_used_list(used_list)
            
            operation = OperationRecord(
                operation_type='添加产品',
                name=name,
                quantity=0,
                detail=f'添加产品: {name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'产品添加成功: {product.id} - {name}')
                return {'success': True, 'product_id': product.id}
            else:
                return {'success': False, 'message': '数据库提交失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品添加异常: {name} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '添加失败'}
        finally:
            self.db.close_session(session)
    
    def _process_products(self, products):
        """处理配方数据，计算可制作数量"""
        materials = {str(m['id']): m for m in self.material_service.get_all_materials()}
        
        result = []
        for product in products:
            try:
                product_materials = json.loads(product.materials)
            except:
                product_materials = {}
            
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
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                self.logger.warning(f'产品删除失败: 产品不存在 - {product_id}')
                return {'success': False, 'message': '产品不存在'}
            
            product_name = product.name
            stock_count = product.stock_count
            
            if stock_count > 0:
                msg = f'产品 {product_name} 已制作数量不为零（{stock_count}个），请先出库或还原后再删除'
                self.logger.warning(f'产品删除失败: {msg}')
                return {'success': False, 'message': msg}
            
            materials = json.loads(product.materials or '{}')
            if not self._update_material_references(session, product_id, materials, {}):
                return {'success': False, 'message': '更新材料引用失败'}
            
            session.delete(product)
            
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
        self.logger.info(f'开始批量删除产品: {len(product_ids)}个, 用户: {username}')
        session = self.db.get_session()
        
        try:
            products = session.query(Product).filter(Product.id.in_(product_ids)).all()
            failed_products = []
            deleted_count = 0
            
            for product in products:
                if product.stock_count and product.stock_count > 0:
                    failed_products.append({
                        'name': product.name,
                        'reason': f'已制作数量不为零（{product.stock_count}个），请先出库或还原后再删除'
                    })
                    continue
                
                materials = json.loads(product.materials or '{}')
                if not self._update_material_references(session, product.id, materials, {}):
                    failed_products.append({
                        'name': product.name,
                        'reason': '更新材料引用失败'
                    })
                    continue
                
                session.delete(product)
                deleted_count += 1
            
            if deleted_count > 0:
                operation = OperationRecord(
                    operation_type='批量删除产品',
                    name=f'批量删除{deleted_count}个产品',
                    quantity=deleted_count,
                    detail=f'批量删除产品ID: {product_ids}',
                    username=username
                )
                session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'批量删除成功: {deleted_count}个产品')
                if failed_products:
                    return {
                        'success': False,
                        'deleted_count': deleted_count,
                        'failed_products': failed_products,
                        'should_close': deleted_count > 0
                    }
                return {'success': True, 'message': f'成功删除 {deleted_count} 个产品'}
            else:
                return {'success': False, 'message': '批量删除失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'批量删除产品异常: {str(e)}', exc_info=True)
            return {'success': False, 'message': '批量删除失败'}
        finally:
            self.db.close_session(session)

    def update_product(self, product_id: int, name: str, materials: dict = None, in_price: float = None, out_price: float = None, manual_price: float = None, username: str = '', image_path: str = None) -> dict:
        """更新产品"""
        self.logger.info(f'开始更新产品: {product_id}, 用户: {username}')
        session = self.db.get_session()
        
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                self.logger.warning(f'产品更新失败: 产品不存在 - {product_id}')
                return {'success': False, 'message': '产品不存在'}
            
            if materials is not None:
                valid, error_msg, material_objs = self._validate_materials(session, materials)
                if not valid:
                    self.logger.warning(f'产品更新验证失败: {error_msg}')
                    return {'success': False, 'message': error_msg}
                
                old_materials = json.loads(product.materials or '{}')
                if not self._update_material_references(session, product_id, old_materials, materials):
                    return {'success': False, 'message': '更新材料引用失败'}
                
                product.materials = json.dumps(materials)
                
                calculated_in_price = 0
                for material_id_str, required_qty in materials.items():
                    material = material_objs.get(material_id_str)
                    if material:
                        calculated_in_price += (material.in_price or 0) * required_qty
                product.in_price = calculated_in_price
            
            product.name = name
            if manual_price is not None:
                product.manual_price = manual_price
            
            product.out_price = (product.in_price or 0) + (product.manual_price or 0)
            
            if image_path is not None:
                product.image_path = image_path
            
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
                return {'success': True}
            else:
                return {'success': False, 'message': '更新失败'}
            
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品更新异常: {product_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '更新失败'}
        finally:
            self.db.close_session(session)
    
    def inbound(self, product_id: int, quantity: int, customer: str = '', username: str = '') -> dict:
        """入库产品"""
        self.logger.info(f'开始产品入库: {product_id}, 数量: {quantity}, 用户: {username}')

        session = self.db.get_session()
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product:
                self.logger.warning(f'产品入库失败: 产品不存在 - {product_id}')
                return {'success': False, 'message': '产品不存在'}
            
            product_name = product.name
            materials = json.loads(product.materials)
            
            material_ids = [int(mid) for mid in materials.keys()]
            materials_objs = session.query(Material).filter(Material.id.in_(material_ids)).all()
            materials_map = {m.id: m for m in materials_objs}
            
            for material_id_str, required_qty in materials.items():
                material = materials_map.get(int(material_id_str))
                if not material or material.stock_count < required_qty * quantity:
                    msg = f'材料库存不足: {material.name if material else material_id_str}'
                    self.logger.warning(f'产品入库失败: {msg}')
                    return {'success': False, 'message': msg}
            
            for material_id_str, required_qty in materials.items():
                material = materials_map.get(int(material_id_str))
                material.stock_count -= required_qty * quantity
            
            product.stock_count = (product.stock_count or 0) + quantity
            
            detail = f'客户: {customer}, 产品制作数量: +{quantity}' if customer else f'产品制作数量: +{quantity}'
            operation = OperationRecord(
                operation_type='产品入库',
                name=product_name,
                quantity=quantity,
                detail=detail,
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'产品入库成功: {product_id}, 数量: {quantity}')
                return {'success': True}
            else:
                return {'success': False, 'message': '入库失败'}
            
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品入库异常: {product_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '入库失败'}
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
                msg = f'产品库存不足，当前: {stock_count}'
                self.logger.warning(f'产品出库失败: {msg}')
                return {'success': False, 'message': msg}
            
            product.stock_count = stock_count - quantity
            
            operation = OperationRecord(
                operation_type='产品出库',
                name=product_name,
                quantity=-quantity,
                detail=f'客户: {customer}, 数量: -{quantity}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'产品出库成功: {product_id}, 数量: {quantity}')
                return {'success': True}
            else:
                return {'success': False, 'message': '出库失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'出库产品异常: {product_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '出库失败'}
        finally:
            self.db.close_session(session)
    
    def restore(self, product_id: int, quantity: int, reason: str = '', username: str = '') -> dict:
        """产品还原"""
        self.logger.info(f'开始产品还原: {product_id}, 数量: {quantity}, 用户: {username}')
        session = self.db.get_session()
        
        try:
            product = session.query(Product).filter(Product.id == product_id).first()
            if not product or (product.stock_count or 0) < quantity:
                msg = '产品不存在或库存不足'
                self.logger.warning(f'产品还原失败: {msg}')
                return {'success': False, 'message': msg}
            
            product_name = product.name
            materials = json.loads(product.materials)
            
            material_ids = [int(mid) for mid in materials.keys()]
            materials_objs = session.query(Material).filter(Material.id.in_(material_ids)).all()
            materials_map = {m.id: m for m in materials_objs}
            
            for material_id_str, required_qty in materials.items():
                material = materials_map.get(int(material_id_str))
                if material:
                    material.stock_count += required_qty * quantity
            
            product.stock_count = (product.stock_count or 0) - quantity
            
            detail = f'还原数量: -{quantity}, 原因: {reason}' if reason else f'还原数量: -{quantity}'
            operation = OperationRecord(
                operation_type='产品还原',
                name=product_name,
                quantity=-quantity,
                detail=detail,
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'产品还原成功: {product_id}, 数量: {quantity}')
                return {'success': True}
            else:
                return {'success': False, 'message': '还原失败'}
            
        except Exception as e:
            session.rollback()
            self.logger.error(f'产品还原异常: {product_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '还原失败'}
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
        """导出产品到Excel"""
        import openpyxl
        from flask import send_file
        from io import BytesIO
        from datetime import datetime
        from PIL import Image
        from openpyxl.drawing.image import Image as XLImage
        from config import Config
        import os
        
        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = '产品列表'
            
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 15
            ws.column_dimensions['C'].width = 12
            ws.column_dimensions['D'].width = 12
            ws.column_dimensions['E'].width = 12
            ws.column_dimensions['F'].width = 12
            ws.column_dimensions['G'].width = 15
            ws.column_dimensions['H'].width = 20
            ws.column_dimensions['I'].width = 20
            
            headers = ['图片', '产品名称', '成本价', '售价', '手工费', '库存数量', '可制作数量', '创建时间', '更新时间']
            ws.append(headers)
            
            session = self.db.get_session()
            try:
                query = session.query(Product).order_by(Product.id)
                
                if product_ids:
                    query = query.filter(Product.id.in_(product_ids))
                
                products = query.all()
                processed_products = self._process_products(products)
                
                row_idx = 2
                for product in processed_products:
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
                    
                    ws.row_dimensions[row_idx].height = 50
                    
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
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
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
