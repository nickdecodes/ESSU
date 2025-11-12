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

import os
import logging
from flask import Blueprint, request, jsonify, abort, send_file
from services.record_service import RecordService
from config import Config


logger = logging.getLogger(__name__)
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
    
    logger.debug(f'获取操作记录: 筛选条件={filters}')
    
    result = record_service.get_records_filtered(filters)
    if result.get('success'):
        logger.info(f'返回操作记录: 总数={result["total"]}')
        return jsonify({'success': True, 'data': result['records'], 'total': result['total']})
    else:
        logger.error(f'获取操作记录失败: {result.get("message", "未知错误")}')
        return jsonify(result)


@record_bp.route('/records/export')
def export_records():
    """导出操作记录"""
    filters = {
        'search': request.args.get('search', ''),
        'start_date': request.args.get('start_date', ''),
        'end_date': request.args.get('end_date', ''),
        'operation_type': request.args.getlist('operation_type'),
        'username': request.args.getlist('username'),
        'sort_order': request.args.get('sort_order', 'desc')
    }
    delete_after_export = request.args.get('deleteAfterExport', 'false').lower() == 'true'
    operator = request.args.get('operator', '')
    
    logger.info(f'导出操作记录: 筛选条件={filters}, 导出后删除={delete_after_export}')
    
    filepath = record_service.export_records_filtered(filters)
    
    if not filepath or not os.path.exists(filepath):
        logger.error('导出操作记录失败: 文件生成失败')
        abort(400, description='导出文件生成失败')
    
    if delete_after_export:
        result = record_service.delete_records_filtered(filters, operator)
        if result.get('success'):
            logger.info(f'导出后删除记录成功: {result["count"]}条')
        else:
            logger.error(f'导出后删除记录失败: {result.get("message", "")}')
    
    logger.info(f'导出操作记录成功: 文件={os.path.basename(filepath)}')
    return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))
