#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: main.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import logging
from logging.handlers import TimedRotatingFileHandler
from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config

# 导入API蓝图
from apis.material_api import material_bp
from apis.product_api import product_bp
from apis.record_api import record_bp
from apis.user_api import user_bp
from apis.common_api import common_bp


# 配置日志
def setup_logging():
    formatter = logging.Formatter(Config.LOG_FORMAT)
    
    file_handler = TimedRotatingFileHandler(
        Config.LOG_FILE,
        when='midnight',
        interval=1,
        backupCount=Config.LOG_BACKUP_COUNT,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(getattr(logging, Config.LOG_LEVEL))
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(getattr(logging, Config.LOG_LEVEL))
    
    logging.getLogger().addHandler(file_handler)
    logging.getLogger().setLevel(getattr(logging, Config.LOG_LEVEL))

app = Flask(__name__)
CORS(app)

# 初始化配置
Config.init_directories()
app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

setup_logging()

# 注册蓝图
app.register_blueprint(material_bp)
app.register_blueprint(user_bp)
app.register_blueprint(product_bp)
app.register_blueprint(record_bp)
app.register_blueprint(common_bp)


# 记录服务启动
app.logger.info('ESSU服务启动')

# 请求日志中间件
@app.before_request
def log_request_info():
    if request.endpoint and request.endpoint != 'static':
        app.logger.info(f'API请求: {request.method} {request.path} - IP: {request.remote_addr}')

@app.after_request
def log_response_info(response):
    if request.endpoint and request.endpoint != 'static':
        app.logger.info(f'API响应: {request.method} {request.path} - 状态码: {response.status_code}')
    return response

# 全局异常处理器
@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f'未处理的异常: {str(e)}', exc_info=True)
    return jsonify({'success': False, 'message': '服务器内部错误'}), 500

@app.errorhandler(404)
def handle_404(e):
    app.logger.warning(f'404错误: {request.url}')
    return jsonify({'success': False, 'message': '接口不存在'}), 404

@app.errorhandler(405)
def handle_405(e):
    app.logger.warning(f'405错误: {request.method} {request.url}')
    return jsonify({'success': False, 'message': '请求方法不允许'}), 405

if __name__ == '__main__':
    try:
        app.logger.info(f'启动Flask服务器 - 端口{Config.PORT}')
        app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)
    except Exception as e:
        app.logger.critical(f'服务器启动失败: {str(e)}', exc_info=True)
    finally:
        app.logger.info('Flask服务器关闭')
