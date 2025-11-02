#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: product_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

from flask import Blueprint, request, jsonify
from services.product_service import ProductService
from config import Config

product_bp = Blueprint('product', __name__)
product_service = ProductService()

# 产品相关API
@product_bp.route('/products', methods=['POST'])
def add_product():
    data = request.json
    name = data.get('name', '')
    in_price = data.get('in_price', 0)
    out_price = data.get('out_price', 0)
    manual_price = data.get('manual_price', 0)
    username = data.get('username', '')
    image_path = data.get('image_path')
    
    result = product_service.add_product(name, data['materials'], in_price, out_price, manual_price, username, image_path)
    if result['success']:
        return jsonify({'success': True, 'product_id': result['product_id']})
    else:
        return jsonify({'success': False, 'message': '产品添加失败'})

@product_bp.route('/products')
def get_products():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', Config.DEFAULT_PAGE_SIZE, type=int)
    
    page_size = min(page_size, Config.MAX_PAGE_SIZE)
    offset = (page - 1) * page_size
    
    products = product_service.get_products_paginated(offset, page_size)
    total = product_service.get_products_count()
    
    return jsonify({
        'data': products,
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
    manual_price = data.get('manual_price')
    username = data.get('username', '')
    image_path = data.get('image_path')
    
    success = product_service.update_product(product_id, name, materials, in_price, out_price, manual_price, username, image_path)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': '产品不存在或更新失败'})

@product_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    data = request.json or {}
    username = data.get('username', '')
    
    result = product_service.delete_product(product_id, username)
    return jsonify(result)

@product_bp.route('/products/batch-delete', methods=['POST'])
def batch_delete_products():
    data = request.json
    product_ids = data.get('product_ids', []) or data.get('formula_ids', [])
    username = data.get('username', '')
    
    result = product_service.batch_delete_products(product_ids, username)
    return jsonify(result)

@product_bp.route('/products/in', methods=['POST'])
def product_in():
    data = request.json
    formula_id = data.get('formula_id')
    quantity = data.get('quantity')
    customer = data.get('customer', '')
    username = data.get('username', '')
    
    if not formula_id or not quantity:
        return jsonify({'success': False, 'message': '缺少必要参数'})
    
    success = product_service.inbound(int(formula_id), quantity, customer, username)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': '配方不存在或材料不足'})

@product_bp.route('/products/out', methods=['POST'])
def product_out():
    data = request.json
    formula_id = data.get('formula_id')
    quantity = data.get('quantity')
    customer = data.get('customer', '')
    username = data.get('username', '')
    
    if not formula_id or not quantity:
        return jsonify({'success': False, 'message': '缺少必要参数'})
    
    result = product_service.outbound(int(formula_id), quantity, customer, username)
    return jsonify(result)

@product_bp.route('/products/restore', methods=['POST'])
def product_restore():
    data = request.json
    formula_id = data.get('formula_id')
    quantity = data.get('quantity')
    reason = data.get('reason', '')
    username = data.get('username', '')
    
    if not formula_id or not quantity or not reason:
        return jsonify({'success': False, 'message': '缺少必要参数'})
    
    success = product_service.restore(int(formula_id), quantity, reason, username)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': '配方不存在或库存不足'})
    
@product_bp.route('/products/<int:product_id>/stock')
def get_product_stock(product_id):
    stock = product_service.calculate_possible_stock(product_id)
    return jsonify({'product_id': product_id, 'possible_stock': stock})

@product_bp.route('/products/import', methods=['POST'])
def import_products():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有上传文件'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '文件名为空'})
    
    username = request.form.get('username', '')
    result = product_service.import_from_excel(file, username)
    return jsonify(result)

@product_bp.route('/products/export')
def export_products():
    # 获取筛选参数
    product_ids = request.args.get('product_ids', '')
    id_list = [int(id) for id in product_ids.split(',') if id] if product_ids else []
    return product_service.export_to_excel(id_list)