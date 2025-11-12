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
from apis.material_api import material_bp
from apis.product_api import product_bp
from apis.record_api import record_bp
from apis.user_api import user_bp
from apis.common_api import common_bp


# ============ 初始化Flask应用 ============
app = Flask(__name__)
CORS(app)
Config.init_directories()
app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH


# ============ 配置日志 ============
def setup_logging():
    log_level = getattr(logging, Config.LOG_LEVEL)
    formatter = logging.Formatter(Config.LOG_FORMAT)
    
    # 文件日志
    file_handler = TimedRotatingFileHandler(
        Config.LOG_FILE, when='midnight', interval=1,
        backupCount=Config.LOG_BACKUP_COUNT, encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)
    
    # 控制台日志
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # 配置根logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # 配置Flask logger
    app.logger.handlers = []
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)
    
    # 隐藏werkzeug日志
    logging.getLogger('werkzeug').setLevel(logging.WARNING)


setup_logging()


# ============ 注册蓝图 ============
for bp in (material_bp, user_bp, product_bp, record_bp, common_bp):
    app.register_blueprint(bp)

app.logger.info('ESSU服务启动')


# ============ 请求/响应日志 ============
@app.before_request
def log_request():
    if request.endpoint and request.endpoint != 'static':
        app.logger.info(f'{request.method} {request.path} | {request.remote_addr}')

@app.after_request
def log_response(response):
    if request.endpoint and request.endpoint != 'static':
        app.logger.info(f'{request.method} {request.path} - {response.status_code}')
    return response


# ============ 错误处理 ============
@app.errorhandler(400)
def handle_400(e):
    app.logger.warning(f'400: {e.description}')
    return jsonify({'success': False, 'message': e.description or '请求错误'}), 400

@app.errorhandler(404)
def handle_404(e):
    app.logger.warning(f'404: {request.url}')
    return jsonify({'success': False, 'message': '接口不存在'}), 404

@app.errorhandler(405)
def handle_405(e):
    app.logger.warning(f'405: {request.method} {request.url}')
    return jsonify({'success': False, 'message': '方法不允许'}), 405

@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f'异常: {str(e)}', exc_info=True)
    return jsonify({'success': False, 'message': '服务器错误'}), 500


# ============ 启动服务 ============
if __name__ == '__main__':
    try:
        app.logger.info(f'启动Flask服务器 - 端口{Config.PORT}')
        app.run(debug=Config.DEBUG, host=Config.HOST, port=Config.PORT)
    except Exception as e:
        app.logger.critical(f'服务器启动失败: {str(e)}', exc_info=True)
    finally:
        app.logger.info('Flask服务器关闭')
