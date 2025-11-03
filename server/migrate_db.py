#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from dbs.db_manager import DBManager

db_path = 'dbs/essu.db'

if os.path.exists(db_path):
    os.remove(db_path)
    print(f'已删除旧数据库: {db_path}')

db = DBManager(db_path)
print('数据库迁移完成')
