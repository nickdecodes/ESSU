# ESSU Server 重构说明

## 🔄 重构目标

将原有的单一职责不清晰的文件结构重构为更清晰、更可扩展的服务化架构。

## 📁 新的文件结构

```
server/
├── main.py                 # 主应用入口 (原 api.py)
├── database/               # 数据库相关
│   ├── __init__.py
│   ├── database_manager.py # 数据库管理器
│   └── essu.db             # SQLite数据库文件
├── services/               # 业务服务层
│   ├── __init__.py
│   ├── material_service.py # 材料服务
│   ├── inventory_service.py# 库存服务
│   ├── user_service.py     # 用户服务
│   ├── formula_service.py  # 配方服务
│   └── export_service.py   # 导出服务
└── requirements.txt        # 依赖配置
```

## 🏗️ 架构改进

### 1. 更清晰的命名规范
- **文件名**: 使用 `service` 后缀明确表示服务层
- **类名**: 去掉 `SQLite` 前缀，使用更通用的命名

### 2. 职责分离
- **DatabaseManager**: 专门负责数据库连接和基础操作
- **MaterialService**: 专门处理材料的增删改查
- **InventoryService**: 专门处理入库出库和记录管理
- **UserService**: 专门处理用户认证和管理
- **FormulaService**: 专门处理配方和生产相关业务
- **ExportService**: 专门处理数据导出功能

### 3. 更好的可扩展性
- 每个服务独立，便于单独测试和维护
- 服务间依赖关系清晰
- 便于后续添加新功能或替换实现

## 🔧 类名对比

| 原类名 | 新类名 | 说明 |
|--------|--------|------|
| SQLiteDatabase | DatabaseManager | 数据库管理器 |
| SQLiteInventorySystem | MaterialService + InventoryService | 拆分为材料服务和库存服务 |
| SQLiteAuthSystem | UserService | 用户服务 |
| SQLiteProductSystem | (已整合到FormulaService) | 产品功能整合到配方服务 |
| SQLiteFormulaSystem | FormulaService | 配方服务 |
| ExcelExporter | ExportService | 导出服务 |

## 🚀 使用方式

### 启动应用
```bash
python main.py
```

### 服务使用示例
```python
# 材料管理
from services.material_service import MaterialService
material_service = MaterialService()
result = material_service.add_material("新材料", 10.0, 8.0, "admin")

# 库存管理
from services.inventory_service import InventoryService
inventory_service = InventoryService()
inventory_service.inbound(1, 100, "供应商A", "admin")

# 用户管理
from services.user_service import UserService
user_service = UserService()
result = user_service.login("admin", "admin123")
```

## 📋 迁移步骤

1. 运行迁移脚本清理旧文件:
   ```bash
   python migrate_to_new_structure.py
   ```

2. 更新启动脚本使用新的 `main.py`

3. 测试所有功能确保正常工作

## ✅ 重构优势

- **可读性**: 文件名和类名更直观
- **可维护性**: 职责分离，便于定位和修改
- **可扩展性**: 新增功能时更容易找到合适的位置
- **可测试性**: 每个服务可以独立测试
- **标准化**: 符合现代软件架构最佳实践