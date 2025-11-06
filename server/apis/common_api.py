# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: common_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import os
import uuid
from flask import Blueprint, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
from config import Config


common_bp = Blueprint('common', __name__)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


@common_bp.route('/upload/image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': '没有上传文件'})
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'})
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # 检查文件名是否包含扩展名
        if '.' in filename:
            file_ext = filename.rsplit('.', 1)[1].lower()
        else:
            # 如果没有扩展名，默认使用jpg
            file_ext = 'jpg'
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        return jsonify({
            'success': True, 
            'image_path': f"images/{unique_filename}",
            'url': f"/images/{unique_filename}"
        })
    
    return jsonify({'success': False, 'message': '不支持的文件格式'})


@common_bp.route('/images/<filename>')
def serve_image(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)



