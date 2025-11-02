# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: record_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

from flask import Blueprint, request, jsonify
from services.record_service import RecordService
from config import Config

record_bp = Blueprint('record', __name__)
record_service = RecordService()

@record_bp.route('/records')
def get_records():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', Config.MAX_RECORDS_PAGE_SIZE, type=int)
    
    # 限制页面大小
    page_size = min(page_size, Config.MAX_RECORDS_PAGE_SIZE)
    offset = (page - 1) * page_size
    
    # 获取筛选参数
    filters = {
        'search': request.args.get('search', ''),
        'start_date': request.args.get('start_date', ''),
        'end_date': request.args.get('end_date', ''),
        'operation_type': request.args.getlist('operation_type'),
        'username': request.args.getlist('username'),
        'sort_order': request.args.get('sort_order', 'desc')
    }
    
    records, total = record_service.get_records_filtered(offset, page_size, filters)
    
    return jsonify({
        'data': records,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size
    })

@record_bp.route('/records/clear', methods=['DELETE'])
def clear_all_records():
    data = request.json or {}
    username = data.get('username', '')
    
    success = record_service.clear_all_records(username)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': '清空记录失败'})