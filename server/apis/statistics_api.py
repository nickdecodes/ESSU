#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: statistics_api.py
@DateTime: 2025/11/14 22:00
@Software: vscode
"""

import logging
from flask import Blueprint, request, jsonify
from services.statistics_service import StatisticsService


logger = logging.getLogger(__name__)
statistics_bp = Blueprint('statistics', __name__)
statistics_service = StatisticsService()


@statistics_bp.route('/statistics/material-trend')
def get_material_trend():
    """获取材料库存趋势"""
    material_id = request.args.get('material_id', type=int)
    days = request.args.get('days', 30, type=int)
    
    result = statistics_service.get_material_trend(material_id, days)
    return jsonify(result)


@statistics_bp.route('/statistics/product-trend')
def get_product_trend():
    """获取产品库存趋势"""
    product_id = request.args.get('product_id', type=int)
    days = request.args.get('days', 30, type=int)
    
    result = statistics_service.get_product_trend(product_id, days)
    return jsonify(result)


@statistics_bp.route('/statistics/top-materials')
def get_top_materials():
    """获取热门材料排行"""
    limit = request.args.get('limit', 10, type=int)
    days = request.args.get('days', 30, type=int)
    
    result = statistics_service.get_top_materials(limit, days)
    return jsonify(result)


@statistics_bp.route('/statistics/top-products')
def get_top_products():
    """获取热门产品排行"""
    limit = request.args.get('limit', 10, type=int)
    days = request.args.get('days', 30, type=int)
    
    result = statistics_service.get_top_products(limit, days)
    return jsonify(result)


@statistics_bp.route('/statistics/summary')
def get_summary():
    """获取统计摘要"""
    days = request.args.get('days', 30, type=int)
    
    result = statistics_service.get_summary(days)
    return jsonify(result)
