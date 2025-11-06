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

from flask import Blueprint, request, jsonify, send_file
from services.record_service import RecordService
from config import Config
import os

record_bp = Blueprint('record', __name__)
record_service = RecordService()

@record_bp.route('/records')
def get_records():
    # 获取筛选参数
    filters = {
        'search': request.args.get('search', ''),
        'start_date': request.args.get('start_date', ''),
        'end_date': request.args.get('end_date', ''),
        'operation_type': request.args.getlist('operation_type'),
        'username': request.args.getlist('username'),
        'sort_order': request.args.get('sort_order', 'desc')
    }
    
    # 调试信息
    print(f"Received filters: {filters}")
    
    records, total = record_service.get_records_filtered(0, 999999, filters)
    
    return jsonify({
        'data': records,
        'total': total
    })

@record_bp.route('/records/export')
def export_records():
    """导出操作记录"""
    try:
        # 获取筛选参数
        filters = {
            'search': request.args.get('search', ''),
            'start_date': request.args.get('start_date', ''),
            'end_date': request.args.get('end_date', ''),
            'operation_type': request.args.getlist('operation_type'),
            'username': request.args.getlist('username'),
            'sort_order': request.args.get('sort_order', 'desc'),
            'delete_after_export': request.args.get('deleteAfterExport', 'false').lower() == 'true'
        }
        
        # 导出记录
        filepath = record_service.export_records_filtered(filters)
        
        if filepath and os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))
        else:
            return jsonify({'success': False, 'message': '导出文件生成失败'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'导出失败: {str(e)}'}), 500

@record_bp.route('/records/clear', methods=['DELETE'])
def clear_all_records():
    data = request.json or {}
    username = data.get('username', '')
    
    success = record_service.clear_all_records(username)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': '清空记录失败'})