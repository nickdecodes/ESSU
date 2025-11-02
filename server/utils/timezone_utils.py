# !/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@Author  : nickdecodes
@Email   : 
@Usage   : 
@Filename: timezone_utils.py
@DateTime: 2025/10/25 23:17
@Software: vscode
"""

from datetime import datetime, timezone, timedelta

# 中国时区
CHINA_TZ = timezone(timedelta(hours=8))

def china_now():
    """获取中国当前时间"""
    return datetime.now(CHINA_TZ)

def format_china_time(dt):
    """格式化中国时间为字符串"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # 如果没有时区信息，假设是中国时间
        dt = dt.replace(tzinfo=CHINA_TZ)
    return dt.strftime('%Y-%m-%d %H:%M:%S')