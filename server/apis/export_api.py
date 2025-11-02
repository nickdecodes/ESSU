# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: export_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

from flask import Blueprint, request, send_file, jsonify
from services.export_service import ExportService
from services.record_service import RecordService
import os

export_bp = Blueprint('export', __name__)
export_service = ExportService()
record_service = RecordService()

@export_bp.route('/export/records')
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
        filepath = export_service.export_operation_records_filtered(filters)
        
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))
        else:
            return jsonify({'success': False, 'message': '导出文件生成失败'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'导出失败: {str(e)}'}), 500

@export_bp.route('/export/database')
def export_database():
    """导出整个数据库"""
    try:
        filepath = export_service.export_all()
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))
        else:
            return jsonify({'success': False, 'message': '导出文件生成失败'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': f'导出失败: {str(e)}'}), 500