# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: user_api.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

import os
import uuid
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from services.user_service import UserService
from dbs.db_manager import DBManager
from dbs.models import OperationRecord
from config import Config


user_bp = Blueprint('user', __name__)
user_service = UserService()


def _allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def _validate_user_data(username, password, role, is_required=True):
    """验证用户数据"""
    if is_required:
        if not username or len(username) > Config.MAX_USERNAME_LENGTH:
            return {'success': False, 'message': f'用户名不能为空且不能超过{Config.MAX_USERNAME_LENGTH}个字符'}
        if not password or len(password) > Config.MAX_PASSWORD_LENGTH:
            return {'success': False, 'message': f'密码不能为空且不能超过{Config.MAX_PASSWORD_LENGTH}个字符'}
    else:
        if username and len(username) > Config.MAX_USERNAME_LENGTH:
            return {'success': False, 'message': f'用户名不能超过{Config.MAX_USERNAME_LENGTH}个字符'}
        if password and len(password) > Config.MAX_PASSWORD_LENGTH:
            return {'success': False, 'message': f'密码不能超过{Config.MAX_PASSWORD_LENGTH}个字符'}
    
    if role and role not in Config.VALID_ROLES:
        return {'success': False, 'message': f'角色只能是{"或".join(Config.VALID_ROLES)}'}
    
    return None


def _save_avatar(file):
    """保存头像文件并返回路径"""
    if not file or not file.filename or not _allowed_file(file.filename):
        return None
    
    filename = secure_filename(file.filename)
    file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'jpg'
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(Config.UPLOAD_FOLDER, unique_filename)
    file.save(file_path)
    return f"images/{unique_filename}"


def _get_user_data_from_request():
    """从请求中获取用户数据"""
    if 'avatar' in request.files:
        return {
            'username': request.form.get('username', '').strip(),
            'password': request.form.get('password', '').strip(),
            'role': request.form.get('role', '').strip(),
            'operator': request.form.get('operator', ''),
            'avatar_path': _save_avatar(request.files['avatar'])
        }
    else:
        data = request.json or {}
        return {
            'username': data.get('username', '').strip() if data.get('username') else None,
            'password': data.get('password', '').strip() if data.get('password') else None,
            'role': data.get('role', '').strip() if data.get('role') else None,
            'operator': data.get('operator', ''),
            'avatar_path': data.get('avatar_path')
        }


@user_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '')
    result = user_service.login(username, data['password'])
    if result['success']:
        # 记录登录操作
        db = DBManager()
        session = db.get_session()
        try:
            operation = OperationRecord(
                operation_type='用户登录',
                name=username,
                quantity=0,
                detail=f'用户登录: {username}',
                username=username
            )
            session.add(operation)
            db.commit_session(session)
        finally:
            db.close_session(session)
    
    return jsonify(result)


@user_bp.route('/logout', methods=['POST'])
def logout():
    data = request.json or {}
    username = data.get('username', '')
    session_id = data.get('session_id', '')
    
    success = user_service.logout(username, session_id)
    return jsonify({'success': success})


@user_bp.route('/users', methods=['POST'])
def add_user():
    """添加用户"""
    user_data = _get_user_data_from_request()
    
    # 验证数据
    error = _validate_user_data(user_data['username'], user_data['password'], user_data['role'], is_required=True)
    if error:
        return jsonify(error)
    
    success = user_service.add_user(
        user_data['username'],
        user_data['password'],
        user_data['role'],
        user_data['operator'],
        user_data['avatar_path']
    )
    
    return jsonify({'success': True} if success else {'success': False, 'message': '用户名已存在'})


@user_bp.route('/users')
def get_users():
    return jsonify(user_service.get_all_users())


@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """更新用户信息"""
    user_data = _get_user_data_from_request()
    
    # 验证数据
    error = _validate_user_data(user_data['username'], user_data['password'], user_data['role'], is_required=False)
    if error:
        return jsonify(error)
    
    result = user_service.update_user(
        user_id,
        user_data['username'],
        user_data['password'],
        user_data['role'],
        user_data['operator'],
        user_data['avatar_path']
    )
    
    return jsonify(result)


@user_bp.route('/users/<username>', methods=['DELETE'])
def delete_user(username):
    """删除用户"""
    data = request.json or {}
    operator = data.get('operator', '')
    success = user_service.delete_user(username, operator)
    return jsonify({'success': True} if success else {'success': False, 'message': '用户不存在或删除失败'})


@user_bp.route('/users/<username>/sessions/<session_id>', methods=['DELETE'])
def remove_user_session(username, session_id):
    """移除用户指定设备会话"""
    data = request.json or {}
    return jsonify(user_service.remove_user_session(username, session_id, data.get('operator', '')))


@user_bp.route('/users/import', methods=['POST'])
def import_users():
    """导入用户"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有上传文件'})
    
    file = request.files['file']
    if not file.filename:
        return jsonify({'success': False, 'message': '文件名为空'})
    
    return jsonify(user_service.import_from_excel(file, request.form.get('operator', '')))


@user_bp.route('/users/export')
def export_users():
    """导出用户"""
    user_ids = request.args.get('user_ids', '')
    user_id_list = [int(uid) for uid in user_ids.split(',') if uid] if user_ids else []
    return user_service.export_to_excel(user_id_list)
