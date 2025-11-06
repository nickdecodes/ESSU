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
            return True, '', {}  # 允许产品不包含材料
        
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
    
    def add_product(self, name: str, materials: dict, in_price: float = 0, out_price: float = 0, other_price: float = 0, username: str = '', image_path: str = None) -> dict:
        """添加产品"""
        session = self.db.get_session()
        try:
            self.logger.info(f'开始添加产品: {name}, 材料数: {len(materials)}, 用户: {username}')
            
            valid, error_msg, material_objs = self._validate_materials(session, materials)
            if not valid:
                self.logger.warning(f'产品添加验证失败: {error_msg}')
                return {'success': False, 'message': error_msg}
            
            # 只有当有材料时才计算成本价，否则使用传入的价格
            if materials:
                calculated_in_price = 0
                for material_id_str, required_qty in materials.items():
                    material = material_objs.get(material_id_str)
                    if material:
                        calculated_in_price += (material.in_price or 0) * required_qty
                final_in_price = calculated_in_price
            else:
                final_in_price = in_price
            
            other_price = other_price or 0
            
            # 只有当有材料时才自动计算售价
            if materials:
                final_out_price = final_in_price + other_price
            else:
                final_out_price = out_price or final_in_price + other_price
            
            materials_json = json.dumps(materials)
            product = Product(
                name=name,
                materials=materials_json,
                in_price=final_in_price,
                out_price=final_out_price,
                other_price=other_price,
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
                'other_price': product.other_price or 0,
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
                    operation_type='删除产品',
                    name=f'删除{deleted_count}个产品',
                    quantity=deleted_count,
                    detail=f'删除产品ID: {product_ids}',
                    username=username
                )
                session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'删除成功: {deleted_count}个产品')
                if failed_products:
                    return {
                        'success': False,
                        'deleted_count': deleted_count,
                        'failed_products': failed_products,
                        'should_close': deleted_count > 0
                    }
                return {'success': True, 'message': f'成功删除 {deleted_count} 个产品'}
            else:
                return {'success': False, 'message': '删除失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'删除产品异常: {str(e)}', exc_info=True)
            return {'success': False, 'message': '删除失败'}
        finally:
            self.db.close_session(session)

    def update_product(self, product_id: int, name: str, materials: dict = None, in_price: float = None, out_price: float = None, other_price: float = None, username: str = '', image_path: str = None) -> dict:
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
                
                # 只有当材料不为空时才重新计算成本价
                if materials:
                    calculated_in_price = 0
                    for material_id_str, required_qty in materials.items():
                        material = material_objs.get(material_id_str)
                        if material:
                            calculated_in_price += (material.in_price or 0) * required_qty
                    product.in_price = calculated_in_price
            
            product.name = name
            if other_price is not None:
                product.other_price = other_price
            
            # 如果直接传入了成本价和售价，则使用传入的值
            if in_price is not None:
                product.in_price = in_price
            if out_price is not None:
                product.out_price = out_price
            
            # 只有当有材料且没有直接传入价格时才自动计算售价
            if materials and out_price is None:
                product.out_price = (product.in_price or 0) + (product.other_price or 0)
            
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
        """从Excel导入产品（简化版，仅支持基本信息）"""
        import openpyxl
        from io import BytesIO
        
        try:
            self.logger.info(f'开始导入产品Excel, 用户: {username}')
            wb = openpyxl.load_workbook(BytesIO(file.read()))
            ws = wb.active
            self.logger.info(f'Excel读取成功, 工作表: {ws.title}')
            
            created_count = 0
            updated_count = 0
            failed_count = 0
            
            for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                # 跳过空行
                if not any(row):
                    continue
                
                # 检测格式：图片、产品名称、成本价、售价、手工费、库存数量
                first_col = str(row[0]) if row[0] else ''
                is_new_format = len(row) >= 6 and (not row[0] or first_col.startswith(('http', 'images/', '#')))
                
                if is_new_format:
                    name_idx, cost_idx, sell_idx, manual_idx, stock_idx = 1, 2, 3, 4, 5
                else:
                    # 兼容旧格式：产品名称、成本价、售价、手工费、库存数量
                    name_idx, cost_idx, sell_idx, manual_idx, stock_idx = 0, 1, 2, 3, 4
                
                if not row[name_idx]:
                    continue
                
                try:
                    name = str(row[name_idx]).strip()
                    in_price = float(row[cost_idx]) if cost_idx < len(row) and row[cost_idx] else 0
                    out_price = float(row[sell_idx]) if sell_idx < len(row) and row[sell_idx] else in_price
                    other_price = float(row[manual_idx]) if manual_idx < len(row) and row[manual_idx] else 0
                    import_stock = int(row[stock_idx]) if stock_idx < len(row) and row[stock_idx] else 0
                    
                    self.logger.info(f'解析行{row_num}: {name}, 成本价={in_price}, 售价={out_price}, 其它费用={other_price}, 库存={import_stock}')
                    
                    # 检查产品是否已存在
                    session = self.db.get_session()
                    try:
                        existing = session.query(Product).filter(Product.name == name).first()
                        
                        if existing:
                            # 产品已存在，强制更新价格和库存
                            self.logger.info(f'更新产品{name}: 原成本价={existing.in_price}, 原售价={existing.out_price}')
                            existing.in_price = in_price
                            existing.out_price = out_price
                            existing.other_price = other_price
                            self.logger.info(f'更新产品{name}: 新成本价={existing.in_price}, 新售价={existing.out_price}')
                            if import_stock > 0:
                                existing.stock_count = (existing.stock_count or 0) + import_stock
                                
                            operation = OperationRecord(
                                operation_type='更新产品',
                                name=name,
                                quantity=import_stock,
                                detail=f'导入更新产品: {name}, 增加库存: +{import_stock}',
                                username=username
                            )
                            session.add(operation)
                            
                            if self.db.commit_session(session):
                                updated_count += 1
                                self.logger.info(f'产品更新成功: {name}, 增加库存: {import_stock}')
                            else:
                                failed_count += 1
                                self.logger.error(f'产品更新失败: {name}')
                        else:
                            # 新产品，创建空材料配方
                            product = Product(
                                name=name,
                                materials='{}',  # 空材料配方
                                in_price=in_price,
                                out_price=out_price,
                                other_price=other_price,
                                stock_count=import_stock
                            )
                            
                            session.add(product)
                            
                            operation = OperationRecord(
                                operation_type='添加产品',
                                name=name,
                                quantity=import_stock,
                                detail=f'导入产品: {name}, 初始库存: {import_stock}',
                                username=username
                            )
                            session.add(operation)
                            
                            if self.db.commit_session(session):
                                created_count += 1
                                self.logger.info(f'产品导入成功: {name}')
                            else:
                                failed_count += 1
                                self.logger.error(f'产品导入失败: {name}')
                    finally:
                        self.db.close_session(session)
                        
                except Exception as e:
                    self.logger.error(f'第{row_num}行导入失败: {str(e)}', exc_info=True)
                    failed_count += 1
            
            total_count = created_count + updated_count + failed_count
            success_count = created_count + updated_count
            msg = f'导入完成，成功 {success_count} 个，失败 {failed_count} 个'
            if failed_count > 0:
                msg += '\n注意：导入的产品将使用空材料配方，请手动编辑添加材料清单'
            
            self.logger.info(msg)
            return {
                'success': True, 
                'message': msg,
                'total_count': total_count,
                'created_count': created_count,
                'updated_count': updated_count
            }
            
        except Exception as e:
            msg = f'导入Excel失败: {str(e)}'
            self.logger.error(msg, exc_info=True)
            return {'success': False, 'message': msg}
    
    def export_to_excel(self, product_ids: list = None, username: str = ''):
        """导出产品到Excel"""
        import openpyxl
        from flask import send_file
        from io import BytesIO
        from datetime import datetime
        from PIL import Image
        from openpyxl.drawing.image import Image as XLImage
        from openpyxl.styles import Alignment
        from config import Config
        import os
        
        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = '产品列表'
            
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 15
            ws.column_dimensions['C'].width = 25
            ws.column_dimensions['D'].width = 12
            ws.column_dimensions['E'].width = 12
            ws.column_dimensions['F'].width = 12
            ws.column_dimensions['G'].width = 12
            ws.column_dimensions['H'].width = 15
            ws.column_dimensions['I'].width = 20
            ws.column_dimensions['J'].width = 20
            
            headers = ['图片', '产品名称', '材料清单', '成本价', '售价', '其它费用', '库存数量', '可制作数量', '创建时间', '更新时间']
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
                    # 构建材料清单字符串
                    materials_text = ''
                    if product.get('materials') and isinstance(product['materials'], list):
                        material_list = []
                        for material in product['materials']:
                            name = material.get('name', material.get('product_id', ''))
                            required = material.get('required', 0)
                            material_list.append(f'{name}×{required}')
                        materials_text = ', '.join(material_list)
                    
                    ws.append([
                        '',
                        product['name'],
                        materials_text,
                        product['in_price'],
                        product['out_price'],
                        product['other_price'],
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
                    
                    # 设置材料清单列自动换行
                    ws[f'C{row_idx}'].alignment = openpyxl.styles.Alignment(wrap_text=True, vertical='top')
                    
                    row_idx += 1
            finally:
                self.db.close_session(session)
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
            filename = f'products_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            
            # 记录导出操作
            if username:
                session = self.db.get_session()
                try:
                    count = len(product_ids) if product_ids else len(processed_products)
                    operation = OperationRecord(
                        operation_type='导出产品',
                        name=f'导出{count}个产品',
                        quantity=count,
                        detail=f'导出产品到Excel: {filename}',
                        username=username
                    )
                    session.add(operation)
                    self.db.commit_session(session)
                finally:
                    self.db.close_session(session)
            
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
    
    def generate_import_template(self):
        """生成产品导入模板"""
        import openpyxl
        from flask import send_file
        from io import BytesIO
        
        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = '产品导入模板'
            
            # 设置列宽
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 12
            ws.column_dimensions['C'].width = 12
            ws.column_dimensions['D'].width = 12
            ws.column_dimensions['E'].width = 12
            
            # 写入表头
            headers = ['产品名称', '成本价', '售价', '其它费用', '库存数量']
            ws.append(headers)
            
            # 添加示例数据
            ws.append([
                '红玛瑙手串',
                25.50,
                35.00,
                5.00,
                10
            ])
            
            ws.append([
                '蓝宝石项链',
                45.00,
                65.00,
                10.00,
                5
            ])
            
            # 添加说明文本
            ws['A5'] = '导入说明：'
            ws['A6'] = '1. 产品名称：必填，不能重复，最多100个字符'
            ws['A7'] = '2. 成本价：必填，数字类型'
            ws['A8'] = '3. 售价：必填，数字类型'
            ws['A9'] = '4. 其它费用：可选，默认为0，数字类型'
            ws['A10'] = '5. 库存数量：可选，默认为0，导入后会加到库存中'
            ws['A11'] = '6. 如果产品名称已存在，将更新该产品的信息'
            ws['A12'] = '7. 导入不支持图片，请在导入后手动上传产品图片'
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name='产品导入模板.xlsx'
            )
            
        except Exception as e:
            self.logger.error(f'生成产品导入模板失败: {str(e)}', exc_info=True)
            from flask import jsonify
            return jsonify({'success': False, 'message': f'生成模板失败: {str(e)}'}), 500
