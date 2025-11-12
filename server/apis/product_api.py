# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: product_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import logging
from flask import Blueprint, request, jsonify, abort
from services.product_service import ProductService
from dbs.db_manager import DBManager
from dbs.models import OperationRecord
from config import Config


logger = logging.getLogger(__name__)
product_bp = Blueprint('product', __name__)
product_service = ProductService()
db = DBManager()


@product_bp.route('/products', methods=['POST'])
def add_product():
    data = request.json
    name = data.get('name', '')
    in_price = data.get('in_price', 0)
    out_price = data.get('out_price', 0)
    other_price = data.get('other_price', 0)
    username = data.get('username', '')
    image_path = data.get('image_path')
    
    result = product_service.add_product(name, data['materials'], in_price, out_price, other_price, image_path)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='添加产品',
                name=name,
                quantity=0,
                detail=f'添加产品: {name}',
                username=username
            ))

    return jsonify(result)
    

@product_bp.route('/products')
def get_products():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', Config.DEFAULT_PAGE_SIZE, type=int)
    
    page_size = min(page_size, Config.MAX_PAGE_SIZE)
    offset = (page - 1) * page_size
    
    result = product_service.get_products_paginated(offset, page_size)
    if not result['success']:
        return jsonify(result)
    
    count_result = product_service.get_products_count()
    total = count_result['count'] if count_result['success'] else 0
    
    return jsonify({
        'success': True,
        'data': result['products'],
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size
    })


@product_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json or {}
    name = data.get('name', '')
    materials = data.get('materials')
    in_price = data.get('in_price')
    out_price = data.get('out_price')
    other_price = data.get('other_price')
    username = data.get('username', '')
    image_path = data.get('image_path')
    
    result = product_service.update_product(product_id, name, materials, in_price, out_price, other_price, image_path)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='更新产品',
                name=name,
                quantity=0,
                detail=f'更新产品: {name}',
                username=username
            ))
    return jsonify(result)


@product_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    data = request.json or {}
    username = data.get('username', '')
    
    result = product_service.delete_product(product_id)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='删除产品',
                name=data.get('name', ''),
                quantity=0,
                detail=f'删除产品',
                username=username
            ))
    return jsonify(result)


@product_bp.route('/products/batch-delete', methods=['POST'])
def batch_delete_products():
    data = request.json
    product_ids = data.get('product_ids', []) or data.get('formula_ids', [])
    username = data.get('username', '')
    
    result = product_service.batch_delete_products(product_ids)
    
    if result.get('deleted_count', 0) > 0:
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='删除产品',
                name=f'删除{result["deleted_count"]}个产品',
                quantity=result['deleted_count'],
                detail=f'删除产品ID: {product_ids}',
                username=username
            ))
    return jsonify(result)


@product_bp.route('/products/in', methods=['POST'])
def product_in():
    data = request.json
    formula_id = data.get('formula_id')
    quantity = data.get('quantity')
    customer = data.get('customer', '')
    username = data.get('username', '')
    
    if not formula_id or not quantity:
        logger.warning('产品入库失败: 缺少必要参数')
        abort(400, description='缺少必要参数')
    
    try:
        logger.info(f'产品入库: ID={formula_id} | 数量={quantity} | 操作者: {username}')
        result = product_service.inbound(int(formula_id), quantity, customer)
        
        if result.get('success'):
            logger.info(f'产品入库成功: ID={formula_id}')
            with db.session_scope() as session:
                detail = f'客户: {customer}, 产品制作数量: +{quantity}' if customer else f'产品制作数量: +{quantity}'
                session.add(OperationRecord(
                    operation_type='产品入库',
                    name=result.get('product_name', ''),
                    quantity=quantity,
                    detail=detail,
                    username=username
                ))
        else:
            logger.warning(f'产品入库失败: ID={formula_id} | 原因: {result.get("message", "")}')
        
        return jsonify(result)
    except ValueError as e:
        logger.warning(f'产品入库参数错误: {str(e)}')
        abort(400, description='无效的产品ID或数量')


@product_bp.route('/products/out', methods=['POST'])
def product_out():
    data = request.json
    formula_id = data.get('formula_id')
    quantity = data.get('quantity')
    customer = data.get('customer', '')
    username = data.get('username', '')
    
    if not formula_id or not quantity:
        logger.warning('产品出库失败: 缺少必要参数')
        abort(400, description='缺少必要参数')
    
    try:
        logger.info(f'产品出库: ID={formula_id} | 数量={quantity} | 操作者: {username}')
        result = product_service.outbound(int(formula_id), quantity, customer)
        
        if result.get('success'):
            logger.info(f'产品出库成功: ID={formula_id}')
            with db.session_scope() as session:
                session.add(OperationRecord(
                    operation_type='产品出库',
                    name=result.get('product_name', ''),
                    quantity=-quantity,
                    detail=f'客户: {customer}, 数量: -{quantity}',
                    username=username
                ))
        else:
            logger.warning(f'产品出库失败: ID={formula_id} | 原因: {result.get("message", "")}')
        
        return jsonify(result)
    except ValueError as e:
        logger.warning(f'产品出库参数错误: {str(e)}')
        abort(400, description='无效的产品ID或数量')


@product_bp.route('/products/restore', methods=['POST'])
def product_restore():
    data = request.json
    formula_id = data.get('formula_id')
    quantity = data.get('quantity')
    reason = data.get('reason', '')
    username = data.get('username', '')
    
    if not formula_id or not quantity or not reason:
        logger.warning('产品还原失败: 缺少必要参数')
        abort(400, description='缺少必要参数')
    
    try:
        logger.info(f'产品还原: ID={formula_id} | 数量={quantity} | 原因: {reason} | 操作者: {username}')
        result = product_service.restore(int(formula_id), quantity, reason)
        
        if result.get('success'):
            logger.info(f'产品还原成功: ID={formula_id}')
            with db.session_scope() as session:
                detail = f'还原数量: -{quantity}, 原因: {reason}' if reason else f'还原数量: -{quantity}'
                session.add(OperationRecord(
                    operation_type='产品还原',
                    name=result.get('product_name', ''),
                    quantity=-quantity,
                    detail=detail,
                    username=username
                ))
        else:
            logger.warning(f'产品还原失败: ID={formula_id} | 原因: {result.get("message", "")}')
        
        return jsonify(result)
    except ValueError as e:
        logger.warning(f'产品还原参数错误: {str(e)}')
        abort(400, description='无效的产品ID或数量')

    
@product_bp.route('/products/<int:product_id>/stock')
def get_product_stock(product_id):
    result = product_service.get_stock(product_id)
    if result.get('success'):
        return jsonify({'success': True, 'product_id': product_id, 'stock': result['stock']})
    return jsonify(result)


@product_bp.route('/products/import', methods=['POST'])
def import_products():
    if 'file' not in request.files:
        logger.warning('导入产品失败: 没有上传文件')
        abort(400, description='没有上传文件')
    
    file = request.files['file']
    if not file.filename:
        logger.warning('导入产品失败: 文件名为空')
        abort(400, description='文件名为空')
    
    username = request.form.get('username', '')
    logger.info(f'导入产品: 文件名={file.filename} | 操作者: {username}')
    
    result = product_service.import_from_excel(file)
    
    if result.get('success'):
        logger.info(f'导入产品成功: {result.get("message", "")}')
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='导入产品',
                name=f'导入{result.get("created_count", 0) + result.get("updated_count", 0)}个产品',
                quantity=result.get('created_count', 0) + result.get('updated_count', 0),
                detail=result.get('message', ''),
                username=username
            ))
    else:
        logger.error(f'导入产品失败: {result.get("message", "")}')
    
    return jsonify(result)


@product_bp.route('/products/export')
def export_products():
    product_ids = request.args.get('product_ids', '')
    username = request.args.get('username', '')
    
    try:
        id_list = [int(id) for id in product_ids.split(',') if id] if product_ids else []
        logger.info(f'导出产品: 数量={len(id_list) if id_list else "全部"} | 操作者: {username}')
        
        if username:
            with db.session_scope() as session:
                count = len(id_list) if id_list else 0
                session.add(OperationRecord(
                    operation_type='导出产品',
                    name=f'导出{count if count else "全部"}个产品',
                    quantity=count,
                    detail=f'导出产品到Excel',
                    username=username
                ))
        
        return product_service.export_to_excel(id_list)
    except ValueError as e:
        logger.warning(f'导出产品参数错误: {str(e)}')
        abort(400, description='无效的产品ID')


@product_bp.route('/products/import-template')
def download_import_template():
    logger.info('下载产品导入模板')
    return product_service.generate_import_template()
