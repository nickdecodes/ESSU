#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 系统监控 API
@Filename: system_api.py
@DateTime: 2025/11/12
@Software: vscode
"""

import logging
from flask import Blueprint, jsonify
from services.system_service import SystemService


logger = logging.getLogger(__name__)
system_bp = Blueprint('system', __name__)
system_service = SystemService()


@system_bp.route('/system/dashboard')
def get_dashboard():
    """获取系统监控仪表盘（所有信息）"""
    try:
        result = system_service.get_all_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取系统仪表盘失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取系统信息失败: {str(e)}'}), 500


@system_bp.route('/system/cpu')
def get_cpu():
    """获取 CPU 信息"""
    try:
        result = system_service.get_cpu_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取 CPU 信息失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取 CPU 信息失败: {str(e)}'}), 500


@system_bp.route('/system/memory')
def get_memory():
    """获取内存信息"""
    try:
        result = system_service.get_memory_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取内存信息失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取内存信息失败: {str(e)}'}), 500


@system_bp.route('/system/disk')
def get_disk():
    """获取磁盘信息"""
    try:
        result = system_service.get_disk_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取磁盘信息失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取磁盘信息失败: {str(e)}'}), 500


@system_bp.route('/system/network')
def get_network():
    """获取网络信息"""
    try:
        result = system_service.get_network_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取网络信息失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取网络信息失败: {str(e)}'}), 500


@system_bp.route('/system/process')
def get_process():
    """获取进程信息"""
    try:
        result = system_service.get_process_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取进程信息失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取进程信息失败: {str(e)}'}), 500


@system_bp.route('/system/info')
def get_system_info():
    """获取系统基本信息"""
    try:
        result = system_service.get_system_info()
        return jsonify(result)
    except Exception as e:
        logger.error(f'获取系统信息失败: {str(e)}', exc_info=True)
        return jsonify({'success': False, 'message': f'获取系统信息失败: {str(e)}'}), 500
