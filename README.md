# 电商出入库系统

React前端 + Python后端 + 文件数据库架构

## 功能特性
- 商品管理：添加商品信息
- 入库管理：记录商品入库
- 出库管理：处理商品出库  
- 库存查询：实时查看库存状态
- 数据持久化：使用JSON文件存储

## 技术栈
- **前端**: React + Axios
- **后端**: Flask + Flask-CORS
- **数据库**: JSON文件存储

## 快速启动

### 方式一：一键启动
```bash
./start.sh
```

### 方式二：分别启动

1. 安装Python依赖：
```bash
cd server
pip install -r requirements.txt
```

2. 启动后端服务：
```bash
cd server
python api.py
```

3. 安装前端依赖并启动：
```bash
cd web
npm install -g n
sudo n 22
# npm install -g pnpm
# npm create vite@latest web  -- --template react
npm install
npm start
```

## 访问地址
- 前端界面：http://localhost:3000
- 后端API：http://localhost:5001

## 数据存储
数据存储在 `data/` 目录下的Excel文件中：
- `products.xlsx` - 商品信息
- `inbound_records.xlsx` - 入库记录
- `outbound_records.xlsx` - 出库记录
- `users.xlsx` - 用户信息