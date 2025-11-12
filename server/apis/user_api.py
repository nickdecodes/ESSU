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
import logging
from flask import Blueprint, request, jsonify, abort
from werkzeug.utils import secure_filename
from services.user_service import UserService
from dbs.db_manager import DBManager
from dbs.models import OperationRecord
from config import Config


logger = logging.getLogger(__name__)
user_bp = Blueprint('user', __name__)
user_service = UserService()
db = DBManager()


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
        avatar_path = None
        if data.get('avatar_url'):
            avatar_path = data.get('avatar_url')
        elif data.get('avatar_path'):
            avatar_path = data.get('avatar_path')
        
        return {
            'username': data.get('username', '').strip() if data.get('username') else None,
            'password': data.get('password', '').strip() if data.get('password') else None,
            'role': data.get('role', '').strip() if data.get('role') else None,
            'operator': data.get('operator', ''),
            'avatar_path': avatar_path
        }


@user_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or 'username' not in data or 'password' not in data:
        logger.warning('登录失败: 缺少用户名或密码')
        abort(400, description='缺少用户名或密码')
    
    username = data.get('username', '').strip()
    logger.info(f'用户登录尝试: {username} | IP: {request.remote_addr}')
    
    result = user_service.login(username, data['password'])
    
    if result.get('success'):
        logger.info(f'用户登录成功: {username} | 会话ID: {result.get("session_id", "N/A")}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='用户登录',
                name=username,
                quantity=0,
                detail=f'用户登录: {username}',
                username=username
            )
            session.add(operation)
    else:
        logger.warning(f'用户登录失败: {username} | 原因: {result.get("message", "未知")}')
    
    return jsonify(result)


@user_bp.route('/logout', methods=['POST'])
def logout():
    data = request.json or {}
    username = data.get('username', '').strip()
    session_id = data.get('session_id', '').strip()
    
    if not username or not session_id:
        logger.warning('登出失败: 缺少用户名或会话ID')
        abort(400, description='缺少用户名或会话ID')
    
    logger.info(f'用户登出: {username} | 会话ID: {session_id}')
    result = user_service.logout(username, session_id)
    
    if result.get('success'):
        logger.info(f'用户登出成功: {username}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='用户登出',
                name=username,
                quantity=0,
                detail=f'用户登出: {username}',
                username=username
            )
            session.add(operation)
    else:
        logger.warning(f'用户登出失败: {username} | 原因: {result.get("message", "未知")}')
    
    return jsonify(result)


@user_bp.route('/users', methods=['POST'])
def add_user():
    """添加用户"""
    user_data = _get_user_data_from_request()
    
    error = _validate_user_data(user_data['username'], user_data['password'], user_data['role'], is_required=True)
    if error:
        logger.warning(f'添加用户验证失败: {error["message"]}')
        abort(400, description=error['message'])
    
    logger.info(f'添加用户: {user_data["username"]} | 角色: {user_data["role"]} | 操作者: {user_data["operator"]}')
    
    result = user_service.add_user(
        user_data['username'],
        user_data['password'],
        user_data['role'],
        user_data['avatar_path']
    )
    
    if result.get('success'):
        logger.info(f'添加用户成功: {user_data["username"]}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='添加用户',
                name=user_data['username'],
                quantity=0,
                detail=f'添加用户: {user_data["username"]}, 角色: {user_data["role"]}',
                username=user_data['operator']
            )
            session.add(operation)
    else:
        logger.warning(f'添加用户失败: {user_data["username"]} - {result.get("message", "")}')  
    
    return jsonify(result)


@user_bp.route('/users')
def get_users():
    logger.debug('获取用户列表')
    result = user_service.get_all_users()
    if result.get('success'):
        logger.debug(f'返回用户数量: {len(result["users"])}')
        return jsonify(result)
    else:
        logger.error(f'获取用户列表失败: {result.get("message", "")}')
        return jsonify(result)


@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """更新用户信息"""
    user_data = _get_user_data_from_request()
    
    error = _validate_user_data(user_data['username'], user_data['password'], user_data['role'], is_required=False)
    if error:
        logger.warning(f'更新用户验证失败: {error["message"]}')
        abort(400, description=error['message'])
    
    logger.info(f'更新用户: ID={user_id} | 操作者: {user_data["operator"]}')
    
    result = user_service.update_user(
        user_id,
        user_data['username'],
        user_data['password'],
        user_data['role'],
        user_data['avatar_path']
    )
    
    if result.get('success'):
        logger.info(f'更新用户成功: ID={user_id}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='编辑用户',
                name=user_data['username'] or f'ID:{user_id}',
                quantity=0,
                detail=f'编辑用户: ID={user_id}',
                username=user_data['operator']
            )
            session.add(operation)
    else:
        logger.warning(f'更新用户失败: ID={user_id} | 原因: {result.get("message", "未知")}')
    
    return jsonify(result)


@user_bp.route('/users/<username>', methods=['DELETE'])
def delete_user(username):
    """删除用户"""
    data = request.json or {}
    operator = data.get('operator', '')
    
    logger.info(f'删除用户: {username} | 操作者: {operator}')
    result = user_service.delete_user(username)
    
    if result.get('success'):
        logger.info(f'删除用户成功: {username}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='删除用户',
                name=username,
                quantity=0,
                detail=f'删除用户: {username}',
                username=operator
            )
            session.add(operation)
    else:
        logger.warning(f'删除用户失败: {username} - {result.get("message", "")}')
    
    return jsonify(result)


@user_bp.route('/users/<username>/sessions/<session_id>', methods=['DELETE'])
def remove_user_session(username, session_id):
    """移除用户指定设备会话"""
    data = request.json or {}
    operator = data.get('operator', '')
    
    logger.info(f'移除用户会话: {username} | 会话ID: {session_id} | 操作者: {operator}')
    result = user_service.remove_user_session(username, session_id)
    
    if result.get('success'):
        logger.info(f'移除用户会话成功: {username}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='移除设备',
                name=username,
                quantity=0,
                detail=f'管理员移除用户 {username} 的设备会话',
                username=operator
            )
            session.add(operation)
    else:
        logger.warning(f'移除用户会话失败: {username}')
    
    return jsonify(result)


@user_bp.route('/users/import', methods=['POST'])
def import_users():
    """导入用户"""
    if 'file' not in request.files:
        logger.warning('导入用户失败: 没有上传文件')
        abort(400, description='没有上传文件')
    
    file = request.files['file']
    if not file.filename:
        logger.warning('导入用户失败: 文件名为空')
        abort(400, description='文件名为空')
    
    operator = request.form.get('operator', '')
    logger.info(f'导入用户: 文件名={file.filename} | 操作者: {operator}')
    
    result = user_service.import_from_excel(file)
    
    if result.get('success'):
        logger.info(f'导入用户成功: {result.get("message", "")}')
        with db.session_scope() as session:
            operation = OperationRecord(
                operation_type='导入用户',
                name=f'导入{result.get("total_count", 0)}个用户',
                quantity=result.get('total_count', 0),
                detail=f'导入用户: {file.filename}, 新增{result.get("created_count", 0)}个, 更新{result.get("updated_count", 0)}个',
                username=operator
            )
            session.add(operation)
    else:
        logger.error(f'导入用户失败: {result.get("message", "")}')
    
    return jsonify(result)


@user_bp.route('/users/export')
def export_users():
    """导出用户"""
    user_ids = request.args.get('user_ids', '')
    operator = request.args.get('operator', '')
    user_id_list = [int(uid) for uid in user_ids.split(',') if uid] if user_ids else []
    all_users = user_service.get_all_users()
    count = len(user_id_list) if user_id_list else len(all_users.get('users', []))
    
    logger.info(f'导出用户: 数量={len(user_id_list) if user_id_list else "全部"} | 操作者: {operator}')
    
    with db.session_scope() as session:
        operation = OperationRecord(
            operation_type='导出用户',
            name=f'导出{count}个用户',
            quantity=count,
            detail=f'导出用户到Excel',
            username=operator
        )
        session.add(operation)
    
    result = user_service.export_to_excel(user_id_list)
    logger.info('导出用户完成')
    
    return result


@user_bp.route('/users/import-template')
def download_import_template():
    """下载用户导入模板"""
    logger.info('下载用户导入模板')
    return user_service.generate_import_template()
