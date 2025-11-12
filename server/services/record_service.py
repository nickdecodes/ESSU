# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: record_service.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import os
import logging
import pandas as pd
from datetime import datetime
from dbs.db_manager import DBManager
from dbs.models import OperationRecord
from utils.timezone_utils import format_china_time, china_now
from config import Config


class RecordService:
    """操作记录服务 - 负责操作记录的查询和管理"""
    
    def __init__(self):
        self.db = DBManager()
        self.logger = logging.getLogger(__name__)
    
    def _format_record(self, r):
        """格式化单条记录"""
        return {
            'id': r.id,
            'operation_type': r.operation_type,
            'name': r.name,
            'quantity': r.quantity,
            'detail': r.detail,
            'username': r.username,
            'created_at': format_china_time(r.created_at)
        }
    
    def _apply_filters(self, query, filters: dict):
        """应用筛选条件"""
        if filters.get('search'):
            query = query.filter(OperationRecord.detail.like(f"%{filters['search']}%"))
        
        if filters.get('start_date'):
            try:
                start_date = datetime.strptime(filters['start_date'], '%Y-%m-%d')
                query = query.filter(OperationRecord.created_at >= start_date)
            except ValueError:
                pass
        
        if filters.get('end_date'):
            try:
                end_date = datetime.strptime(filters['end_date'], '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                query = query.filter(OperationRecord.created_at <= end_date)
            except ValueError:
                pass
        
        if filters.get('operation_type'):
            query = query.filter(OperationRecord.operation_type.in_(filters['operation_type']))
        
        if filters.get('username'):
            query = query.filter(OperationRecord.username.in_(filters['username']))
        
        return query
    
    def get_records_filtered(self, filters: dict):
        """根据筛选条件获取操作记录"""
        try:
            with self.db.session_scope() as session:
                query = self._apply_filters(session.query(OperationRecord), filters)
                query = query.order_by(
                    OperationRecord.created_at.asc() if filters.get('sort_order') == 'asc' 
                    else OperationRecord.created_at.desc()
                )
                records = query.all()
                return {'success': True, 'records': [self._format_record(r) for r in records], 'total': len(records)}
        except Exception as e:
            self.logger.error(f'筛选操作记录异常: {str(e)}', exc_info=True)
            return {'success': False, 'message': '查询失败'}
    
    def delete_records_filtered(self, filters: dict, username: str = '') -> dict:
        """根据筛选条件删除操作记录"""
        try:
            with self.db.session_scope() as session:
                query = self._apply_filters(session.query(OperationRecord), filters)
                count = query.count()
                query.delete(synchronize_session=False)
                session.add(OperationRecord(
                    operation_type='删除记录',
                    name='系统操作',
                    quantity=count,
                    detail=f'删除{count}条操作记录',
                    username=username
                ))
                self.logger.info(f'删除操作记录成功: {count}条, 操作者: {username}')
                return {'success': True, 'count': count}
        except Exception as e:
            self.logger.error(f'删除操作记录异常: {str(e)}', exc_info=True)
            return {'success': False, 'message': '删除失败'}
    
    def export_records_filtered(self, filters: dict):
        """根据筛选条件导出操作记录"""
        result = self.get_records_filtered(filters)
        if not result['success']:
            return None
        
        data = [{
            '操作时间': r['created_at'],
            '操作类型': r['operation_type'],
            '操作详情': r['detail'] or '',
            '操作用户': r['username'] or ''
        } for r in result['records']]
        
        df = pd.DataFrame(data)
        filename = f'operation_records_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        filepath = os.path.join(Config.EXPORT_FOLDER, filename)
        df.to_excel(filepath, index=False)
        
        return filepath