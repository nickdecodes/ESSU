# !/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
from services.material_service import MaterialService
from config import Config
import uuid
import os
from werkzeug.utils import secure_filename

material_bp = Blueprint('material', __name__)
material_service = MaterialService()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@material_bp.route('/materials', methods=['POST'])
def add_material():
    if 'image' in request.files:
        name = request.form.get('name', '').strip()
        in_price = float(request.form.get('in_price', 0))
        out_price = float(request.form.get('out_price', in_price))
        username = request.form.get('username', '')
        
        if not name or len(name) > Config.MAX_NAME_LENGTH:
            return jsonify({'success': False, 'message': f'材料名称不能为空且不能超过{Config.MAX_NAME_LENGTH}个字符'})
        
        file = request.files['image']
        image_path = None
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            if '.' in filename:
                file_ext = filename.rsplit('.', 1)[1].lower()
            else:
                file_ext = 'jpg'
            unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
            file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
            file.save(file_path)
            image_path = f"images/{unique_filename}"
        
        result = material_service.add_material(name, in_price, out_price, username, image_path)
    else:
        data = request.json
        name = data.get('name', '').strip()
        if not name or len(name) > Config.MAX_NAME_LENGTH:
            return jsonify({'success': False, 'message': f'材料名称不能为空且不能超过{Config.MAX_NAME_LENGTH}个字符'})
        
        in_price = data.get('in_price', 0)
        out_price = data.get('out_price', in_price)
        username = data.get('username', '')
        
        result = material_service.add_material(name, in_price, out_price, username)
    
    if result['success']:
        return jsonify({'success': True, 'material_id': result['material_id']})
    else:
        return jsonify(result)

@material_bp.route('/materials')
def get_materials():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', Config.DEFAULT_PAGE_SIZE, type=int)
    
    page_size = min(page_size, Config.MAX_PAGE_SIZE)
    offset = (page - 1) * page_size
    
    materials = material_service.get_materials_paginated(offset, page_size)
    total = material_service.get_materials_count()
    
    return jsonify({
        'data': materials,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size
    })

@material_bp.route('/materials/<int:material_id>/check-products', methods=['POST'])
def check_related_products(material_id):
    data = request.json or {}
    in_price = data.get('in_price')
    out_price = data.get('out_price')
    
    result = material_service.check_related_products(material_id, in_price, out_price)
    return jsonify(result)

@material_bp.route('/materials/<int:material_id>', methods=['PUT'])
def update_material(material_id):
    data = request.json or {}
    name = data.get('name', '').strip()
    in_price = data.get('in_price')
    out_price = data.get('out_price')
    username = data.get('username', '')
    image_path = data.get('image_path')
    
    if not name or len(name) > Config.MAX_NAME_LENGTH:
        return jsonify({'success': False, 'message': f'材料名称不能为空且不能超过{Config.MAX_NAME_LENGTH}个字符'})
    
    result = material_service.update_material(material_id, name, in_price, out_price, username, image_path)
    return jsonify(result)

@material_bp.route('/materials/<int:material_id>', methods=['DELETE'])
def delete_material(material_id):
    data = request.json or {}
    username = data.get('username', '')
    
    result = material_service.delete_material(material_id, username)
    return jsonify(result)

@material_bp.route('/materials/batch-delete', methods=['POST'])
def batch_delete_materials():
    data = request.json
    material_ids = data.get('material_ids', [])
    username = data.get('username', '')
    result = material_service.batch_delete_materials(material_ids, username)
    return jsonify(result)

@material_bp.route('/materials/in', methods=['POST'])
def material_in():
    data = request.json
    material_id = data.get('material_id') or data.get('product_id')
    quantity = data.get('quantity')
    supplier = data.get('supplier', '').strip()
    username = data.get('username', '')
    
    if not quantity or quantity < Config.MIN_QUANTITY or quantity > Config.MAX_QUANTITY:
        return jsonify({'success': False, 'message': f'数量必须在{Config.MIN_QUANTITY}-{Config.MAX_QUANTITY}之间'})
    if supplier and len(supplier) > Config.MAX_SUPPLIER_LENGTH:
        return jsonify({'success': False, 'message': f'供应商名称不能超过{Config.MAX_SUPPLIER_LENGTH}个字符'})
    
    result = material_service.inbound(int(material_id), quantity, supplier, username)
    return jsonify(result)

@material_bp.route('/materials/out', methods=['POST'])
def material_out():
    data = request.json
    material_id = data.get('material_id') or data.get('product_id')
    quantity = data.get('quantity')
    customer = data.get('customer', '')
    username = data.get('username', '')
    
    result = material_service.outbound(int(material_id), quantity, customer, username)
    return jsonify(result)

@material_bp.route('/materials/<int:material_id>/stock')
def get_material_stock(material_id):
    stock = material_service.get_stock(material_id)
    return jsonify({'material_id': material_id, 'stock': stock})

@material_bp.route('/materials/import', methods=['POST'])
def import_materials():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有上传文件'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '文件名为空'})
    
    username = request.form.get('username', '')
    result = material_service.import_from_excel(file, username)
    return jsonify(result)

@material_bp.route('/materials/export')
def export_materials():
    material_ids = request.args.get('material_ids', '')
    id_list = [int(id) for id in material_ids.split(',') if id] if material_ids else []
    return material_service.export_to_excel(id_list)
