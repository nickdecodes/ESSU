#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: statistics_service.py
@DateTime: 2025/11/14 22:00
@Software: vscode
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy import func
from dbs.db_manager import DBManager
from dbs.models import MaterialHistory, ProductHistory, Material, Product


class StatisticsService:
    """统计服务 - 提供数据分析和趋势统计"""
    
    def __init__(self):
        self.db = DBManager()
        self.logger = logging.getLogger(__name__)
    
    def get_material_trend(self, material_id: int = None, days: int = 30) -> dict:
        """获取材料库存趋势"""
        try:
            with self.db.session_scope() as session:
                start_date = datetime.now() - timedelta(days=days)
                query = session.query(
                    func.date(MaterialHistory.created_at).label('date'),
                    func.sum(MaterialHistory.quantity).label('total_quantity'),
                    func.avg(MaterialHistory.in_price).label('avg_in_price'),
                    func.avg(MaterialHistory.out_price).label('avg_out_price')
                ).filter(MaterialHistory.created_at >= start_date)
                
                if material_id:
                    query = query.filter(MaterialHistory.material_id == material_id)
                
                results = query.group_by(func.date(MaterialHistory.created_at)).all()
                
                return {
                    'success': True,
                    'data': [{
                        'date': str(r.date),
                        'quantity': r.total_quantity or 0,
                        'avg_in_price': round(r.avg_in_price or 0, 2),
                        'avg_out_price': round(r.avg_out_price or 0, 2)
                    } for r in results]
                }
        except Exception as e:
            self.logger.error(f'获取材料趋势失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': '获取材料趋势失败', 'data': []}
    
    def get_product_trend(self, product_id: int = None, days: int = 30) -> dict:
        """获取产品库存趋势"""
        try:
            with self.db.session_scope() as session:
                start_date = datetime.now() - timedelta(days=days)
                query = session.query(
                    func.date(ProductHistory.created_at).label('date'),
                    func.sum(ProductHistory.quantity).label('total_quantity'),
                    func.avg(ProductHistory.in_price).label('avg_in_price'),
                    func.avg(ProductHistory.final_price).label('avg_final_price')
                ).filter(ProductHistory.created_at >= start_date)
                
                if product_id:
                    query = query.filter(ProductHistory.product_id == product_id)
                
                results = query.group_by(func.date(ProductHistory.created_at)).all()
                
                return {
                    'success': True,
                    'data': [{
                        'date': str(r.date),
                        'quantity': r.total_quantity or 0,
                        'avg_in_price': round(r.avg_in_price or 0, 2),
                        'avg_final_price': round(r.avg_final_price or 0, 2)
                    } for r in results]
                }
        except Exception as e:
            self.logger.error(f'获取产品趋势失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': '获取产品趋势失败', 'data': []}
    
    def get_top_materials(self, limit: int = 10, days: int = 30) -> dict:
        """获取热门材料排行"""
        try:
            with self.db.session_scope() as session:
                start_date = datetime.now() - timedelta(days=days)
                results = session.query(
                    MaterialHistory.material_id,
                    MaterialHistory.material_name,
                    func.sum(func.abs(MaterialHistory.quantity)).label('total_quantity')
                ).filter(
                    MaterialHistory.created_at >= start_date
                ).group_by(
                    MaterialHistory.material_id, MaterialHistory.material_name
                ).order_by(
                    func.sum(func.abs(MaterialHistory.quantity)).desc()
                ).limit(limit).all()
                
                return {
                    'success': True,
                    'data': [{
                        'material_id': r.material_id,
                        'material_name': r.material_name,
                        'total_quantity': r.total_quantity or 0
                    } for r in results]
                }
        except Exception as e:
            self.logger.error(f'获取热门材料失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': '获取热门材料失败', 'data': []}
    
    def get_top_products(self, limit: int = 10, days: int = 30) -> dict:
        """获取热门产品排行"""
        try:
            with self.db.session_scope() as session:
                start_date = datetime.now() - timedelta(days=days)
                results = session.query(
                    ProductHistory.product_id,
                    ProductHistory.product_name,
                    func.sum(func.abs(ProductHistory.quantity)).label('total_quantity'),
                    func.sum(ProductHistory.final_price * func.abs(ProductHistory.quantity)).label('total_revenue')
                ).filter(
                    ProductHistory.created_at >= start_date,
                    ProductHistory.operation_type == 'outbound'
                ).group_by(
                    ProductHistory.product_id, ProductHistory.product_name
                ).order_by(
                    func.sum(ProductHistory.final_price * func.abs(ProductHistory.quantity)).desc()
                ).limit(limit).all()
                
                return {
                    'success': True,
                    'data': [{
                        'product_id': r.product_id,
                        'product_name': r.product_name,
                        'total_quantity': r.total_quantity or 0,
                        'total_revenue': round(r.total_revenue or 0, 2)
                    } for r in results]
                }
        except Exception as e:
            self.logger.error(f'获取热门产品失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': '获取热门产品失败', 'data': []}
    
    def get_summary(self, days: int = 30) -> dict:
        """获取统计摘要"""
        try:
            with self.db.session_scope() as session:
                start_date = datetime.now() - timedelta(days=days)
                
                # 材料统计
                material_stats = session.query(
                    func.count(func.distinct(MaterialHistory.material_id)).label('material_count'),
                    func.sum(func.abs(MaterialHistory.quantity)).label('material_quantity')
                ).filter(MaterialHistory.created_at >= start_date).first()
                
                # 产品统计
                product_stats = session.query(
                    func.count(func.distinct(ProductHistory.product_id)).label('product_count'),
                    func.sum(func.abs(ProductHistory.quantity)).label('product_quantity'),
                    func.sum(ProductHistory.final_price * func.abs(ProductHistory.quantity)).label('total_revenue')
                ).filter(
                    ProductHistory.created_at >= start_date,
                    ProductHistory.operation_type == 'outbound'
                ).first()
                
                # 当前库存
                current_materials = session.query(
                    func.count(Material.id).label('total_materials'),
                    func.sum(Material.stock_count).label('total_material_stock')
                ).first()
                
                current_products = session.query(
                    func.count(Product.id).label('total_products'),
                    func.sum(Product.stock_count).label('total_product_stock')
                ).first()
                
                return {
                    'success': True,
                    'data': {
                        'material_types': material_stats.material_count or 0,
                        'material_transactions': material_stats.material_quantity or 0,
                        'product_types': product_stats.product_count or 0,
                        'product_transactions': product_stats.product_quantity or 0,
                        'total_revenue': round(product_stats.total_revenue or 0, 2),
                        'current_material_count': current_materials.total_materials or 0,
                        'current_material_stock': current_materials.total_material_stock or 0,
                        'current_product_count': current_products.total_products or 0,
                        'current_product_stock': current_products.total_product_stock or 0
                    }
                }
        except Exception as e:
            self.logger.error(f'获取统计摘要失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': '获取统计摘要失败'}
