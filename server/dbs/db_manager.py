# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: db_manager.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import StaticPool
from dbs.models import Base, Material, User, Product, OperationRecord
from contextlib import contextmanager


class DBManager:
    """数据库管理器 - 负责数据库连接和ORM操作"""
    
    def __init__(self, db_path=None):
        if db_path is None:
            from config import Config
            db_path = Config.DATABASE_PATH
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)
        # 确保database目录存在
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.logger.info(f'初始化数据库: {db_path}')
        
        # 创建数据库引擎，使用连接池优化性能
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            poolclass=StaticPool,
            connect_args={'check_same_thread': False}
        )
        
        # 创建会话工厂
        self.Session = scoped_session(sessionmaker(bind=self.engine))
        
        # 初始化数据库
        self.init_database()
    
    def init_database(self):
        """初始化数据库表"""
        Base.metadata.create_all(self.engine)
        
        with self.session_scope() as session:
            user_count = session.query(User).count()
            if user_count == 0:
                admin_user = User(
                    username='admin',
                    password='admin123',
                    role='admin',
                    avatar_path='https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
                )
                normal_user = User(
                    username='user',
                    password='user123',
                    role='user',
                    avatar_path='https://api.dicebear.com/7.x/avataaars/svg?seed=user'
                )
                session.add(admin_user)
                session.add(normal_user)
                self.logger.info('初始化默认用户完成')
    
    def get_session(self):
        """获取数据库会话"""
        return self.Session()
    
    def close_session(self, session):
        """关闭数据库会话"""
        if session:
            session.close()
    
    def commit_session(self, session):
        """提交会话"""
        try:
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            self.logger.error(f'数据库提交异常: {str(e)}', exc_info=True)
            return False
    
    @contextmanager
    def session_scope(self):
        """提供会话上下文管理器"""
        session = self.get_session()
        try:
            yield session
            if not self.commit_session(session):
                raise Exception('数据库提交失败')
        finally:
            self.close_session(session)