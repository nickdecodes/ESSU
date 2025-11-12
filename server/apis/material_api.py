# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: material_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import os
import uuid
import logging
from flask import Blueprint, request, jsonify, abort
from werkzeug.utils import secure_filename
from services.material_service import MaterialService
from dbs.db_manager import DBManager
from dbs.models import OperationRecord
from config import Config


logger = logging.getLogger(__name__)
material_bp = Blueprint('material', __name__)
material_service = MaterialService()
db = DBManager()


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
        
        result = material_service.add_material(name, in_price, out_price, image_path)
    else:
        data = request.json
        name = data.get('name', '').strip()
        if not name or len(name) > Config.MAX_NAME_LENGTH:
            return jsonify({'success': False, 'message': f'材料名称不能为空且不能超过{Config.MAX_NAME_LENGTH}个字符'})
        
        in_price = data.get('in_price', 0)
        out_price = data.get('out_price', in_price)
        username = data.get('username', '')
        
        result = material_service.add_material(name, in_price, out_price)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='添加材料',
                name=name,
                quantity=0,
                detail=f'添加材料: {name}',
                username=username
            ))
    return jsonify(result)


@material_bp.route('/materials')
def get_materials():
    try:
        result = material_service.get_all_materials()
        if not result['success']:
            return jsonify({'success': False, 'message': result.get('message', '获取材料列表失败'), 'materials': []})
        
        return jsonify({
            'success': True,
            'materials': result.get('materials', [])
        })
    except Exception as e:
        logger.error(f'获取材料列表失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': '获取材料列表失败', 'materials': []})


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
    
    result = material_service.update_material(material_id, name, in_price, out_price, image_path)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='更新材料',
                name=name,
                quantity=0,
                detail=f'更新材料: {name}',
                username=username
            ))
    return jsonify(result)


@material_bp.route('/materials/<int:material_id>', methods=['DELETE'])
def delete_material(material_id):
    data = request.json or {}
    username = data.get('username', '')
    
    result = material_service.delete_material(material_id)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='删除材料',
                name=data.get('name', ''),
                quantity=0,
                detail=f'删除材料',
                username=username
            ))
    return jsonify(result)


@material_bp.route('/materials/batch-delete', methods=['POST'])
def batch_delete_materials():
    data = request.json
    material_ids = data.get('material_ids', [])
    username = data.get('username', '')
    
    result = material_service.batch_delete_materials(material_ids)
    
    if result.get('deleted_count', 0) > 0:
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='删除材料',
                name=f'删除{result["deleted_count"]}个材料',
                quantity=result['deleted_count'],
                detail=f'删除材料ID: {material_ids}',
                username=username
            ))
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
    
    result = material_service.inbound(int(material_id), quantity, supplier)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='材料入库',
                name=result.get('material_name', ''),
                quantity=quantity,
                detail=f'供应商: {supplier}, 数量: +{quantity}',
                username=username
            ))
    return jsonify(result)


@material_bp.route('/materials/out', methods=['POST'])
def material_out():
    data = request.json
    material_id = data.get('material_id') or data.get('product_id')
    quantity = data.get('quantity')
    customer = data.get('customer', '')
    username = data.get('username', '')
    
    result = material_service.outbound(int(material_id), quantity, customer)
    
    if result.get('success'):
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='材料出库',
                name=result.get('material_name', ''),
                quantity=-quantity,
                detail=f'客户: {customer}, 数量: -{quantity}',
                username=username
            ))
    return jsonify(result)


@material_bp.route('/materials/<int:material_id>/stock')
def get_material_stock(material_id):
    result = material_service.get_stock(material_id)
    if result.get('success'):
        return jsonify({'success': True, 'material_id': material_id, 'stock': result['stock']})
    return jsonify(result)


@material_bp.route('/materials/import', methods=['POST'])
def import_materials():
    if 'file' not in request.files:
        logger.warning('导入材料失败: 没有上传文件')
        abort(400, description='没有上传文件')
    
    file = request.files['file']
    if not file.filename:
        logger.warning('导入材料失败: 文件名为空')
        abort(400, description='文件名为空')
    
    username = request.form.get('username', '')
    logger.info(f'导入材料: 文件名={file.filename} | 操作者: {username}')
    
    result = material_service.import_from_excel(file)
    
    if result.get('success'):
        logger.info(f'导入材料成功: {result.get("message", "")}')
        with db.session_scope() as session:
            session.add(OperationRecord(
                operation_type='导入材料',
                name=f'导入{result.get("created_count", 0) + result.get("updated_count", 0)}个材料',
                quantity=result.get('created_count', 0) + result.get('updated_count', 0),
                detail=result.get('message', ''),
                username=username
            ))
    else:
        logger.error(f'导入材料失败: {result.get("message", "")}')
    
    return jsonify(result)


@material_bp.route('/materials/export')
def export_materials():
    material_ids = request.args.get('material_ids', '')
    username = request.args.get('username', '')
    
    try:
        id_list = [int(id) for id in material_ids.split(',') if id] if material_ids else []
        logger.info(f'导出材料: 数量={len(id_list) if id_list else "全部"} | 操作者: {username}')
        
        if username:
            with db.session_scope() as session:
                count = len(id_list) if id_list else 0
                session.add(OperationRecord(
                    operation_type='导出材料',
                    name=f'导出{count if count else "全部"}个材料',
                    quantity=count,
                    detail=f'导出材料到Excel',
                    username=username
                ))
        
        return material_service.export_to_excel(id_list)
    except ValueError as e:
        logger.warning(f'导出材料参数错误: {str(e)}')
        abort(400, description='无效的材料ID')


@material_bp.route('/materials/import-template')
def download_import_template():
    logger.info('下载材料导入模板')
    return material_service.generate_import_template()
