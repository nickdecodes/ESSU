#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 系统监控服务
@Filename: system_service.py
@DateTime: 2025/11/12
@Software: vscode
"""

import os
import psutil
import logging
from datetime import datetime
from config import Config


class SystemService:
    """系统监控服务 - 提供 CPU、内存、磁盘等系统信息"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def get_cpu_info(self) -> dict:
        """获取 CPU 信息"""
        try:
            # CPU 使用率（百分比）- 使用 0.1 秒间隔减少等待时间
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # CPU 核心数
            cpu_count_logical = psutil.cpu_count(logical=True)  # 逻辑核心
            cpu_count_physical = psutil.cpu_count(logical=False)  # 物理核心
            
            # CPU 频率
            cpu_freq = psutil.cpu_freq()
            
            # 每个核心的使用率 - 使用非阻塞方式
            cpu_percent_per_core = psutil.cpu_percent(interval=0, percpu=True)
            
            return {
                'success': True,
                'cpu': {
                    'usage_percent': round(cpu_percent, 2),
                    'count': {
                        'logical': cpu_count_logical,
                        'physical': cpu_count_physical
                    },
                    'frequency': {
                        'current': round(cpu_freq.current, 2) if cpu_freq else None,
                        'min': round(cpu_freq.min, 2) if cpu_freq else None,
                        'max': round(cpu_freq.max, 2) if cpu_freq else None
                    } if cpu_freq else None,
                    'per_core_usage': [round(p, 2) for p in cpu_percent_per_core],
                    'status': self._get_status(cpu_percent, 80, 90)
                }
            }
        except Exception as e:
            self.logger.error(f'获取 CPU 信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取 CPU 信息失败: {str(e)}'}
    
    def get_memory_info(self) -> dict:
        """获取内存信息"""
        try:
            # 内存信息
            memory = psutil.virtual_memory()
            
            # 交换分区信息
            swap = psutil.swap_memory()
            
            return {
                'success': True,
                'memory': {
                    'total': self._bytes_to_gb(memory.total),
                    'available': self._bytes_to_gb(memory.available),
                    'used': self._bytes_to_gb(memory.used),
                    'free': self._bytes_to_gb(memory.free),
                    'percent': round(memory.percent, 2),
                    'status': self._get_status(memory.percent, 80, 90)
                },
                'swap': {
                    'total': self._bytes_to_gb(swap.total),
                    'used': self._bytes_to_gb(swap.used),
                    'free': self._bytes_to_gb(swap.free),
                    'percent': round(swap.percent, 2),
                    'status': self._get_status(swap.percent, 50, 80)
                }
            }
        except Exception as e:
            self.logger.error(f'获取内存信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取内存信息失败: {str(e)}'}
    
    def get_disk_info(self) -> dict:
        """获取磁盘信息"""
        try:
            # 获取所有磁盘分区
            partitions = psutil.disk_partitions()
            
            disk_info = []
            for partition in partitions:
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    disk_info.append({
                        'device': partition.device,
                        'mountpoint': partition.mountpoint,
                        'fstype': partition.fstype,
                        'total': self._bytes_to_gb(usage.total),
                        'used': self._bytes_to_gb(usage.used),
                        'free': self._bytes_to_gb(usage.free),
                        'percent': round(usage.percent, 2),
                        'status': self._get_status(usage.percent, 80, 90)
                    })
                except PermissionError:
                    # 某些分区可能没有权限访问
                    continue
            
            # 磁盘 IO 统计
            disk_io = psutil.disk_io_counters()
            
            return {
                'success': True,
                'disks': disk_info,
                'io': {
                    'read_count': disk_io.read_count,
                    'write_count': disk_io.write_count,
                    'read_bytes': self._bytes_to_gb(disk_io.read_bytes),
                    'write_bytes': self._bytes_to_gb(disk_io.write_bytes)
                } if disk_io else None
            }
        except Exception as e:
            self.logger.error(f'获取磁盘信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取磁盘信息失败: {str(e)}'}
    
    def get_network_info(self) -> dict:
        """获取网络信息"""
        try:
            # 网络 IO 统计
            net_io = psutil.net_io_counters()
            
            # 网络连接数 - macOS 需要特殊权限，捕获异常
            connections_count = 0
            try:
                connections = psutil.net_connections(kind='inet')
                connections_count = len(connections)
            except (psutil.AccessDenied, PermissionError):
                # macOS 上可能需要 sudo 权限，返回 0 而不是失败
                self.logger.warning('获取网络连接数需要特殊权限，返回 0')
                connections_count = 0
            
            return {
                'success': True,
                'network': {
                    'bytes_sent': self._bytes_to_gb(net_io.bytes_sent),
                    'bytes_recv': self._bytes_to_gb(net_io.bytes_recv),
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv,
                    'connections': connections_count
                }
            }
        except Exception as e:
            self.logger.error(f'获取网络信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取网络信息失败: {str(e)}'}
    
    def get_process_info(self) -> dict:
        """获取进程信息"""
        try:
            # 当前进程信息
            current_process = psutil.Process()
            
            # 进程内存使用
            memory_info = current_process.memory_info()
            
            # 进程 CPU 使用率
            cpu_percent = current_process.cpu_percent(interval=1)
            
            return {
                'success': True,
                'process': {
                    'pid': current_process.pid,
                    'name': current_process.name(),
                    'status': current_process.status(),
                    'cpu_percent': round(cpu_percent, 2),
                    'memory': {
                        'rss': self._bytes_to_mb(memory_info.rss),  # 物理内存
                        'vms': self._bytes_to_mb(memory_info.vms),  # 虚拟内存
                    },
                    'threads': current_process.num_threads(),
                    'create_time': datetime.fromtimestamp(current_process.create_time()).isoformat()
                }
            }
        except Exception as e:
            self.logger.error(f'获取进程信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取进程信息失败: {str(e)}'}
    
    def get_system_info(self) -> dict:
        """获取系统基本信息"""
        try:
            # 系统启动时间
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            
            # 系统运行时间
            uptime = datetime.now() - boot_time
            
            return {
                'success': True,
                'system': {
                    'boot_time': boot_time.isoformat(),
                    'uptime': str(uptime).split('.')[0],  # 去掉微秒
                    'platform': os.name,
                    'python_version': os.sys.version.split()[0]
                }
            }
        except Exception as e:
            self.logger.error(f'获取系统信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取系统信息失败: {str(e)}'}
    
    def get_all_info(self) -> dict:
        """获取所有系统信息"""
        try:
            cpu_info = self.get_cpu_info()
            memory_info = self.get_memory_info()
            disk_info = self.get_disk_info()
            network_info = self.get_network_info()
            process_info = self.get_process_info()
            system_info = self.get_system_info()
            
            return {
                'success': True,
                'timestamp': datetime.now().isoformat(),
                'cpu': cpu_info.get('cpu') if cpu_info.get('success') else None,
                'memory': memory_info.get('memory') if memory_info.get('success') else None,
                'swap': memory_info.get('swap') if memory_info.get('success') else None,
                'disks': disk_info.get('disks') if disk_info.get('success') else None,
                'disk_io': disk_info.get('io') if disk_info.get('success') else None,
                'network': network_info.get('network') if network_info.get('success') else None,
                'process': process_info.get('process') if process_info.get('success') else None,
                'system': system_info.get('system') if system_info.get('success') else None
            }
        except Exception as e:
            self.logger.error(f'获取系统信息失败: {str(e)}', exc_info=True)
            return {'success': False, 'message': f'获取系统信息失败: {str(e)}'}
    
    @staticmethod
    def _bytes_to_gb(bytes_value: int) -> float:
        """字节转 GB"""
        return round(bytes_value / (1024 ** 3), 2)
    
    @staticmethod
    def _bytes_to_mb(bytes_value: int) -> float:
        """字节转 MB"""
        return round(bytes_value / (1024 ** 2), 2)
    
    @staticmethod
    def _get_status(percent: float, warning_threshold: float, danger_threshold: float) -> str:
        """根据使用率获取状态"""
        if percent >= danger_threshold:
            return 'danger'
        elif percent >= warning_threshold:
            return 'warning'
        else:
            return 'normal'
