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

from dbs.db_manager import DBManager
from dbs.models import OperationRecord
from utils.timezone_utils import format_china_time
from datetime import datetime
import logging

class RecordService:
    """操作记录服务 - 负责操作记录的查询和管理"""
    
    def __init__(self):
        self.db = DBManager()
        self.logger = logging.getLogger(__name__)
    
    def get_all_records(self):
        """获取所有操作记录"""
        session = self.db.get_session()
        try:
            records = session.query(OperationRecord).order_by(OperationRecord.created_at.desc()).all()
            return [{
                'id': r.id,
                'operation_type': r.operation_type,
                'name': r.name,
                'quantity': r.quantity,
                'detail': r.detail,
                'username': r.username,
                'created_at': format_china_time(r.created_at)
            } for r in records]
        finally:
            self.db.close_session(session)
    
    def get_records_paginated(self, offset: int, limit: int):
        """分页获取操作记录"""
        session = self.db.get_session()
        try:
            records = session.query(OperationRecord).order_by(OperationRecord.created_at.desc()).offset(offset).limit(limit).all()
            return [{
                'id': r.id,
                'operation_type': r.operation_type,
                'name': r.name,
                'quantity': r.quantity,
                'detail': r.detail,
                'username': r.username,
                'created_at': format_china_time(r.created_at)
            } for r in records]
        finally:
            self.db.close_session(session)
    
    def get_records_count(self) -> int:
        """获取操作记录总数"""
        session = self.db.get_session()
        try:
            return session.query(OperationRecord).count()
        finally:
            self.db.close_session(session)
    
    def get_records_filtered(self, offset: int, limit: int, filters: dict):
        """根据筛选条件获取操作记录"""
        session = self.db.get_session()
        try:
            query = session.query(OperationRecord)
            
            # 搜索筛选
            if filters.get('search'):
                search_term = f"%{filters['search']}%"
                query = query.filter(OperationRecord.detail.like(search_term))
            
            # 日期筛选
            if filters.get('start_date'):
                try:
                    start_date = datetime.strptime(filters['start_date'], '%Y-%m-%d')
                    query = query.filter(OperationRecord.created_at >= start_date)
                except ValueError:
                    pass
            
            if filters.get('end_date'):
                try:
                    end_date = datetime.strptime(filters['end_date'], '%Y-%m-%d')
                    # 结束日期包含当天的所有时间
                    end_date = end_date.replace(hour=23, minute=59, second=59)
                    query = query.filter(OperationRecord.created_at <= end_date)
                except ValueError:
                    pass
            
            # 操作类型筛选
            if filters.get('operation_type'):
                query = query.filter(OperationRecord.operation_type.in_(filters['operation_type']))
            
            # 用户筛选
            if filters.get('username'):
                query = query.filter(OperationRecord.username.in_(filters['username']))
            
            # 排序
            if filters.get('sort_order') == 'asc':
                query = query.order_by(OperationRecord.created_at.asc())
            else:
                query = query.order_by(OperationRecord.created_at.desc())
            
            # 获取总数
            total = query.count()
            
            # 分页
            records = query.offset(offset).limit(limit).all()
            
            return [{
                'id': r.id,
                'operation_type': r.operation_type,
                'name': r.name,
                'quantity': r.quantity,
                'detail': r.detail,
                'username': r.username,
                'created_at': format_china_time(r.created_at)
            } for r in records], total
            
        finally:
            self.db.close_session(session)
    
    def export_records_filtered(self, filters: dict):
        """根据筛选条件导出操作记录"""
        import pandas as pd
        import os
        from utils.timezone_utils import china_now
        from config import Config
        
        session = self.db.get_session()
        try:
            # 获取符合条件的记录
            records, _ = self.get_records_filtered(0, 999999, filters)
            
            data = []
            for r in records:
                data.append({
                    '操作时间': r['created_at'],
                    '操作类型': r['operation_type'],
                    '操作详情': r['detail'] or '',
                    '操作用户': r['username'] or ''
                })
            
            df = pd.DataFrame(data)
            filename = f'operation_records_{china_now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = os.path.join(Config.EXPORT_FOLDER, filename)
            df.to_excel(filepath, index=False)
            
            # 如果需要删除原数据
            if filters.get('delete_after_export', False):
                # 这里可以实现删除逻辑，但需要谨慎
                pass
            
            return filepath
        finally:
            self.db.close_session(session)
    
    def clear_all_records(self, username: str = '') -> bool:
        """清空所有操作记录"""
        session = self.db.get_session()
        try:
            # 删除所有记录
            session.query(OperationRecord).delete()
            
            # 记录清空操作
            operation = OperationRecord(
                operation_type='清空记录',
                name='系统操作',
                quantity=0,
                detail='清空所有操作记录',
                username=username
            )
            session.add(operation)
            
            if self.db.commit_session(session):
                self.logger.info(f'操作记录清空成功，操作者: {username}')
                return True
            else:
                return False
                
        except Exception as e:
            session.rollback()
            self.logger.error(f'清空操作记录异常: {str(e)}', exc_info=True)
            return False
        finally:
            self.db.close_session(session)