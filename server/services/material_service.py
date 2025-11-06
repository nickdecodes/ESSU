#!/usr/bin/env python
# -*- coding: utf-8 -*-

from dbs.db_manager import DBManager
from dbs.models import Material, OperationRecord
from utils.timezone_utils import format_china_time
import logging
import json

class MaterialService:
    """材料服务 - 负责材料的增删改查和库存管理"""
    
    def __init__(self):
        self.db = DBManager()
        self.logger = logging.getLogger(__name__)
    
    def _parse_used_list(self, used_by_products_str: str) -> list:
        """解析used_by_products JSON字符串"""
        try:
            return json.loads(used_by_products_str or '[]')
        except (json.JSONDecodeError, TypeError):
            self.logger.warning(f'解析used_by_products失败: {used_by_products_str}')
            return []
    
    def get_products_using_material(self, material_id: int) -> list:
        """获取使用该材料的产品ID列表"""
        session = self.db.get_session()
        try:
            material = session.query(Material).filter(Material.id == material_id).first()
            if not material:
                return []
            return self._parse_used_list(material.used_by_products)
        finally:
            self.db.close_session(session)
    
    def add_material(self, name: str, in_price: float, out_price: float = None, username: str = '', image_path: str = None, detail: str = None, stock_count: int = 0) -> dict:
        """添加材料"""
        if out_price is None:
            out_price = in_price
        
        session = self.db.get_session()
        try:
            self.logger.info(f'开始添加材料: {name}, 用户: {username}')
            
            material = Material(
                name=name,
                in_price=in_price,
                out_price=out_price,
                image_path=image_path,
                stock_count=stock_count
            )
            
            session.add(material)
            session.flush()
            
            operation = OperationRecord(
                operation_type='添加材料',
                name=name,
                quantity=0,
                detail=detail or f'添加材料: {name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'材料添加成功: {material.id} - {name}')
                return {'success': True, 'material_id': material.id}
            else:
                self.logger.error(f'材料添加失败: 数据库提交失败 - {name}')
                return {'success': False, 'message': '数据库提交失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'材料添加异常: {name} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '添加失败'}
        finally:
            self.db.close_session(session)
    
    def get_all_materials(self):
        """获取所有材料"""
        session = self.db.get_session()
        try:
            materials = session.query(Material).order_by(Material.id).all()
            return [{
                'id': m.id,
                'name': m.name,
                'in_price': m.in_price,
                'out_price': m.out_price,
                'stock_count': m.stock_count,
                'image_path': m.image_path,
                'used_by_products': self._parse_used_list(m.used_by_products),
                'is_used': len(self._parse_used_list(m.used_by_products)) > 0,
                'created_at': format_china_time(m.created_at),
                'updated_at': format_china_time(m.updated_at)
            } for m in materials]
        finally:
            self.db.close_session(session)
    
    def get_materials_paginated(self, offset: int, limit: int):
        """分页获取材料"""
        session = self.db.get_session()
        try:
            materials = session.query(Material).order_by(Material.id).offset(offset).limit(limit).all()
            return [{
                'id': m.id,
                'name': m.name,
                'in_price': m.in_price,
                'out_price': m.out_price,
                'stock_count': m.stock_count,
                'image_path': m.image_path,
                'used_by_products': self._parse_used_list(m.used_by_products),
                'is_used': len(self._parse_used_list(m.used_by_products)) > 0,
                'created_at': format_china_time(m.created_at),
                'updated_at': format_china_time(m.updated_at)
            } for m in materials]
        finally:
            self.db.close_session(session)
    
    def get_materials_count(self) -> int:
        """获取材料总数"""
        session = self.db.get_session()
        try:
            return session.query(Material).count()
        finally:
            self.db.close_session(session)
    
    def delete_material(self, material_id: int, username: str = '') -> dict:
        """删除材料"""
        self.logger.info(f'开始删除材料: {material_id}, 用户: {username}')
        
        session = self.db.get_session()
        try:
            material = session.query(Material).filter(Material.id == material_id).first()
            if not material:
                self.logger.warning(f'材料删除失败: 材料不存在 - {material_id}')
                return {'success': False, 'message': '材料不存在'}
            
            material_name = material.name
            stock_count = material.stock_count
            
            if stock_count > 0:
                msg = f'材料 {material_name} 库存不为零（{stock_count}个），请先出库后再删除'
                self.logger.warning(f'材料删除失败: {msg}')
                return {'success': False, 'message': msg}
            
            used_list = self._parse_used_list(material.used_by_products)
            if len(used_list) > 0:
                msg = f'被{len(used_list)}个产品使用，请先删除相关产品'
                self.logger.warning(f'材料删除失败: {msg}')
                return {'success': False, 'message': msg}
            
            session.delete(material)
            
            operation = OperationRecord(
                operation_type='删除材料',
                name=material_name,
                quantity=0,
                detail=f'删除材料: {material_name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'材料删除成功: {material_id} - {material_name}')
                return {'success': True}
            else:
                self.logger.error(f'材料删除失败: 数据库提交失败 - {material_id}')
                return {'success': False, 'message': '删除失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'材料删除异常: {material_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '删除失败'}
        finally:
            self.db.close_session(session)
    
    def batch_delete_materials(self, material_ids: list, username: str = '') -> dict:
        """批量删除材料"""
        self.logger.info(f'开始批量删除材料: {len(material_ids)}个, 用户: {username}')
        session = self.db.get_session()
        
        try:
            materials = session.query(Material).filter(Material.id.in_(material_ids)).all()
            failed_materials = []
            deleted_count = 0
            
            for material in materials:
                if material.stock_count > 0:
                    failed_materials.append({
                        'name': material.name,
                        'reason': f'库存不为零（{material.stock_count}个），请先出库后再删除'
                    })
                    continue
                
                used_list = self._parse_used_list(material.used_by_products)
                if len(used_list) > 0:
                    failed_materials.append({
                        'name': material.name,
                        'reason': f'被{len(used_list)}个产品使用，请先删除相关产品'
                    })
                    continue
                
                session.delete(material)
                deleted_count += 1
            
            if deleted_count > 0:
                operation = OperationRecord(
                    operation_type='删除材料',
                    name=f'删除{deleted_count}个材料',
                    quantity=deleted_count,
                    detail=f'删除材料ID: {material_ids}',
                    username=username
                )
                session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'删除成功: {deleted_count}个材料')
                if failed_materials:
                    return {
                        'success': False,
                        'deleted_count': deleted_count,
                        'failed_materials': failed_materials,
                        'should_close': deleted_count > 0
                    }
                return {'success': True, 'message': f'成功删除 {deleted_count} 个材料'}
            else:
                return {'success': False, 'message': '删除失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'删除材料异常: {str(e)}', exc_info=True)
            return {'success': False, 'message': '删除失败'}
        finally:
            self.db.close_session(session)
    
    def check_related_products(self, material_id: int, in_price: float = None, out_price: float = None) -> dict:
        """检查使用该材料的产品列表"""
        session = self.db.get_session()
        try:
            from dbs.models import Product
            
            material = session.query(Material).filter(Material.id == material_id).first()
            if not material:
                return {'success': False, 'message': '材料不存在'}
            
            price_changed = False
            if in_price is not None and material.in_price != in_price:
                price_changed = True
            if out_price is not None and material.out_price != out_price:
                price_changed = True
            
            if not price_changed:
                return {'success': True, 'price_changed': False, 'affected_products': []}
            
            products = session.query(Product).all()
            material_id_str = str(material_id)
            affected_products = []
            
            for product in products:
                try:
                    materials = json.loads(product.materials)
                    if material_id_str in materials:
                        current_cost = 0
                        current_selling = 0
                        new_cost = 0
                        new_selling = 0
                        
                        for mat_id, required_qty in materials.items():
                            mat = session.query(Material).filter(Material.id == int(mat_id)).first()
                            if mat:
                                current_cost += (mat.in_price or 0) * required_qty
                                current_selling += (mat.out_price or 0) * required_qty
                                
                                if int(mat_id) == material_id:
                                    new_cost += (in_price if in_price is not None else mat.in_price or 0) * required_qty
                                    new_selling += (out_price if out_price is not None else mat.out_price or 0) * required_qty
                                else:
                                    new_cost += (mat.in_price or 0) * required_qty
                                    new_selling += (mat.out_price or 0) * required_qty
                        
                        other_price = product.other_price or 0
                        current_selling += other_price
                        new_selling += other_price
                        
                        material_list = []
                        for mat_id, qty in materials.items():
                            mat = session.query(Material).filter(Material.id == int(mat_id)).first()
                            if mat:
                                material_list.append(f'{mat.name}×{qty}')
                        
                        affected_products.append({
                            'id': product.id,
                            'name': product.name,
                            'image_path': product.image_path,
                            'materials': ', '.join(material_list),
                            'current_cost': round(current_cost, 2),
                            'current_selling': round(current_selling, 2),
                            'new_cost': round(new_cost, 2),
                            'new_selling': round(new_selling, 2)
                        })
                except (json.JSONDecodeError, ValueError):
                    continue
            
            return {
                'success': True,
                'price_changed': True,
                'affected_products': affected_products
            }
            
        except Exception as e:
            self.logger.error(f'检查相关产品失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': '检查失败'}
        finally:
            self.db.close_session(session)
    
    def update_material(self, material_id: int, name: str, in_price: float = None, out_price: float = None, username: str = '', image_path: str = None, detail: str = None, stock_count: int = None) -> dict:
        """更新材料信息"""
        self.logger.info(f'开始更新材料: {material_id}, 用户: {username}')
        session = self.db.get_session()
        
        try:
            material = session.query(Material).filter(Material.id == material_id).first()
            if not material:
                self.logger.warning(f'材料更新失败: 材料不存在 - {material_id}')
                return {'success': False, 'message': '材料不存在'}
            
            price_changed = False
            if in_price is not None and material.in_price != in_price:
                price_changed = True
            if out_price is not None and material.out_price != out_price:
                price_changed = True
            
            material.name = name
            if in_price is not None:
                material.in_price = in_price
            if out_price is not None:
                material.out_price = out_price
            if image_path is not None:
                material.image_path = image_path
            if stock_count is not None:
                material.stock_count = stock_count
            
            if price_changed:
                self._update_related_products_price(session, material_id)
            
            operation = OperationRecord(
                operation_type='更新材料',
                name=name,
                quantity=0,
                detail=detail or f'更新材料: {name}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'材料更新成功: {material_id} - {name}')
                return {'success': True, 'price_changed': price_changed}
            else:
                self.logger.error(f'材料更新失败: 数据库提交失败 - {material_id}')
                return {'success': False, 'message': '更新失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'材料更新异常: {material_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '更新失败'}
        finally:
            self.db.close_session(session)
    
    def _update_related_products_price(self, session, material_id: int):
        """更新使用该材料的产品价格"""
        from dbs.models import Product
        
        try:
            products = session.query(Product).all()
            material_id_str = str(material_id)
            
            for product in products:
                try:
                    materials = json.loads(product.materials)
                    
                    if material_id_str in materials:
                        total_in_price = 0
                        
                        for mat_id, required_qty in materials.items():
                            material = session.query(Material).filter(Material.id == int(mat_id)).first()
                            if material:
                                total_in_price += (material.in_price or 0) * required_qty
                        
                        product.in_price = total_in_price
                        product.out_price = total_in_price + (product.other_price or 0)
                        
                        self.logger.debug(f'更新产品价格: {product.name} - 成本: {total_in_price}, 售价: {product.out_price}')
                        
                except (json.JSONDecodeError, ValueError) as e:
                    self.logger.warning(f'解析产品材料失败: {product.id} - {str(e)}')
                    continue
                    
        except Exception as e:
            self.logger.error(f'更新相关产品价格失败: {str(e)}', exc_info=True)
    
    def inbound(self, material_id: int, quantity: int, supplier: str, username: str = '') -> dict:
        """入库材料"""
        self.logger.info(f'开始材料入库: {material_id}, 数量: {quantity}, 用户: {username}')
        
        session = self.db.get_session()
        try:
            material = session.query(Material).filter(Material.id == material_id).first()
            if not material:
                self.logger.warning(f'材料入库失败: 材料不存在 - {material_id}')
                return {'success': False, 'message': '材料不存在'}
            
            material.stock_count += quantity
            
            operation = OperationRecord(
                operation_type='材料入库',
                name=material.name,
                quantity=quantity,
                detail=f'供应商: {supplier}, 数量: +{quantity}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'材料入库成功: {material_id}, 数量: {quantity}')
                return {'success': True}
            else:
                self.logger.error(f'材料入库失败: 数据库提交失败 - {material_id}')
                return {'success': False, 'message': '入库失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'材料入库异常: {material_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '入库失败'}
        finally:
            self.db.close_session(session)
    
    def outbound(self, material_id: int, quantity: int, customer: str, username: str = '') -> dict:
        """出库操作"""
        self.logger.info(f'开始材料出库: {material_id}, 数量: {quantity}, 用户: {username}')
        session = self.db.get_session()
        
        try:
            material = session.query(Material).filter(Material.id == material_id).first()
            if not material:
                return {'success': False, 'message': '材料不存在'}
            
            current_stock = material.stock_count
            if current_stock < quantity:
                msg = f'库存不足，当前库存: {current_stock}'
                self.logger.warning(f'材料出库失败: {msg}')
                return {'success': False, 'message': msg}
            
            material.stock_count -= quantity
            
            operation = OperationRecord(
                operation_type='材料出库',
                name=material.name,
                quantity=-quantity,
                detail=f'客户: {customer}, 数量: -{quantity}',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'材料出库成功: {material_id}, 数量: {quantity}')
                return {'success': True}
            else:
                return {'success': False, 'message': '出库失败'}
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'材料出库异常: {material_id} - {str(e)}', exc_info=True)
            return {'success': False, 'message': '出库失败'}
        finally:
            self.db.close_session(session)
    
    def get_stock(self, material_id: int) -> int:
        """获取材料库存"""
        session = self.db.get_session()
        try:
            material = session.query(Material).filter(Material.id == material_id).first()
            return material.stock_count if material else 0
        finally:
            self.db.close_session(session)
    
    def import_from_excel(self, file, username: str = '') -> dict:
        """从Excel导入材料"""
        import openpyxl
        from io import BytesIO
        
        try:
            self.logger.info(f'开始导入Excel, 用户: {username}')
            wb = openpyxl.load_workbook(BytesIO(file.read()))
            ws = wb.active
            self.logger.info(f'Excel读取成功, 工作表: {ws.title}')
            
            created_count = 0
            updated_count = 0
            failed_count = 0
            
            for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                first_col = str(row[0]) if row[0] else ''
                is_new_format = len(row) >= 7 and (not row[0] or first_col.startswith(('http', 'images/', '#')))
                
                if is_new_format:
                    name_idx, price_in_idx, price_out_idx, stock_idx = 1, 2, 3, 4
                else:
                    name_idx, price_in_idx, price_out_idx, stock_idx = 0, 1, 2, 3
                
                if not row[name_idx]:
                    continue
                
                try:
                    name = str(row[name_idx]).strip()
                    in_price = float(row[price_in_idx]) if row[price_in_idx] else 0
                    out_price = float(row[price_out_idx]) if row[price_out_idx] else in_price
                    import_stock = int(row[stock_idx]) if stock_idx < len(row) and row[stock_idx] else 0
                    
                    session = self.db.get_session()
                    existing = session.query(Material).filter(Material.name == name).first()
                    self.db.close_session(session)
                    
                    if existing:
                        # 检查价格是否匹配
                        if existing.in_price != in_price:
                            self.logger.error(f'第{row_num}行导入失败: {name} 进价不匹配，数据库: {existing.in_price}, 导入: {in_price}')
                            failed_count += 1
                            continue
                        if existing.out_price != out_price:
                            self.logger.error(f'第{row_num}行导入失败: {name} 售价不匹配，数据库: {existing.out_price}, 导入: {out_price}')
                            failed_count += 1
                            continue
                        
                        # 库存自增
                        new_stock = existing.stock_count + import_stock
                        detail = f'导入材料: {name}, 增加库存: +{import_stock}'
                        
                        result = self.update_material(
                            existing.id, name, in_price, out_price, username, 
                            None, detail, new_stock
                        )
                        if result.get('success'):
                            updated_count += 1
                        else:
                            failed_count += 1
                    else:
                        detail = f'导入材料: {name}, 初始库存: {import_stock}'
                        result = self.add_material(
                            name, in_price, out_price, username, 
                            None, detail, import_stock
                        )
                        if result.get('success'):
                            created_count += 1
                        else:
                            failed_count += 1
                            
                except Exception as e:
                    self.logger.error(f'第{row_num}行导入失败: {str(e)}', exc_info=True)
                    failed_count += 1
            
            total_count = created_count + updated_count + failed_count
            success_count = created_count + updated_count
            msg = f'导入完成，成功 {success_count} 个，失败 {failed_count} 个'
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
    
    def export_to_excel(self, material_ids: list = None, username: str = ''):
        """导出材料到Excel"""
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
            ws.title = '材料列表'
            
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 15
            ws.column_dimensions['C'].width = 12
            ws.column_dimensions['D'].width = 12
            ws.column_dimensions['E'].width = 12
            ws.column_dimensions['F'].width = 20
            ws.column_dimensions['G'].width = 20
            
            headers = ['图片', '材料名称', '进价', '售价', '库存数量', '创建时间', '更新时间']
            ws.append(headers)
            
            session = self.db.get_session()
            try:
                query = session.query(Material).order_by(Material.id)
                
                if material_ids:
                    query = query.filter(Material.id.in_(material_ids))
                
                materials = query.all()
                
                row_idx = 2
                for material in materials:
                    ws.append([
                        '',
                        material.name,
                        material.in_price,
                        material.out_price,
                        material.stock_count,
                        format_china_time(material.created_at),
                        format_china_time(material.updated_at)
                    ])
                    
                    ws.row_dimensions[row_idx].height = 50
                    
                    if material.image_path:
                        try:
                            if material.image_path.startswith(('http://', 'https://')):
                                ws[f'A{row_idx}'] = material.image_path
                            else:
                                image_file = os.path.join(Config.UPLOAD_FOLDER, os.path.basename(material.image_path))
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
                            self.logger.warning(f'插入图片失败: {material.name} - {str(e)}')
                    
                    row_idx += 1
            finally:
                self.db.close_session(session)
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
            filename = f'materials_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            
            # 记录导出操作
            if username:
                session = self.db.get_session()
                try:
                    count = len(material_ids) if material_ids else len(materials)
                    operation = OperationRecord(
                        operation_type='导出材料',
                        name=f'导出{count}个材料',
                        quantity=count,
                        detail=f'导出材料到Excel: {filename}',
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
        """生成材料导入模板"""
        import openpyxl
        from flask import send_file
        from io import BytesIO
        
        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = '材料导入模板'
            
            # 设置列宽
            ws.column_dimensions['A'].width = 15
            ws.column_dimensions['B'].width = 12
            ws.column_dimensions['C'].width = 12
            ws.column_dimensions['D'].width = 10
            
            # 写入表头
            headers = ['材料名称', '进价', '售价', '数量']
            ws.append(headers)
            
            # 添加示例数据
            ws.append([
                '红玛瑙珠子',
                10.50,
                15.00,
                100
            ])
            
            ws.append([
                '银线',
                2.30,
                3.50,
                50
            ])
            
            # 添加说明文本
            ws['A5'] = '导入说明：'
            ws['A6'] = '1. 材料名称：必填，不能重复，最多100个字符'
            ws['A7'] = '2. 进价：必填，数字类型'
            ws['A8'] = '3. 售价：可选，默认为进价，数字类型'
            ws['A9'] = '4. 数量：可选，默认为0，导入后会加到库存中'
            ws['A10'] = '5. 如果材料名称已存在，将更新该材料的信息'
            ws['A11'] = '6. 导入不支持图片，请在导入后手动上传材料图片'
            
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name='材料导入模板.xlsx'
            )
            
        except Exception as e:
            self.logger.error(f'生成材料导入模板失败: {str(e)}', exc_info=True)
            from flask import jsonify
            return jsonify({'success': False, 'message': f'生成模板失败: {str(e)}'}), 500
