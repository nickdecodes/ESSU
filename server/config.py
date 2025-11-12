#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: config.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import os

class Config:
    """应用配置类"""
    
    # 数据库配置
    DATABASE_PATH = 'dbs/essu.db'
    
    # 文件上传配置
    UPLOAD_FOLDER = 'uploads/images'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}
    ALLOWED_EXTENSIONS_TEXT = 'PNG/JPG/JPEG/GIF/WEBP/SVG'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # 日志配置
    LOG_FOLDER = 'logs'
    LOG_FILE = 'logs/essu.log'
    LOG_BACKUP_COUNT = 7
    # 日志级别：DEBUG(开发) | INFO(测试) | WARNING(生产)
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')  # 默认INFO，可通过环境变量覆盖
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # 导出配置
    EXPORT_FOLDER = 'exports'
    
    # 分页配置
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    MAX_RECORDS_PAGE_SIZE = 200
    
    # 业务规则配置
    MAX_NAME_LENGTH = 100
    MAX_USERNAME_LENGTH = 50
    MAX_PASSWORD_LENGTH = 100
    MAX_SUPPLIER_LENGTH = 100
    MAX_CUSTOMER_LENGTH = 100
    MAX_DETAIL_LENGTH = 500
    MIN_QUANTITY = 1
    MAX_QUANTITY = 999999
    
    # Flask配置
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5274))
    
    # 用户角色
    ADMIN_ROLE = 'admin'
    USER_ROLE = 'user'
    VALID_ROLES = [ADMIN_ROLE, USER_ROLE]
    
    # 用户会话配置
    MAX_CONCURRENT_SESSIONS = 3  # 每个用户最大并发登录数
    SESSION_TIMEOUT = 24 * 60 * 60  # 会话超时时间（秒）
    
    # 性能监控配置
    SLOW_REQUEST_THRESHOLD = float(os.getenv('SLOW_REQUEST_THRESHOLD', 1.0))  # 慢请求阈值（秒）
    ENABLE_RESPONSE_TIME_HEADER = os.getenv('ENABLE_RESPONSE_TIME_HEADER', 'True').lower() == 'true'  # 是否添加响应时间头
    
    @classmethod
    def init_directories(cls):
        """初始化必要的目录"""
        directories = [
            cls.UPLOAD_FOLDER,
            cls.LOG_FOLDER,
            cls.EXPORT_FOLDER,
            os.path.dirname(cls.DATABASE_PATH)
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)