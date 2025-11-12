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

### 两步启动

```bash
# 1. 配置项目（首次运行）
./configure

# 2. 启动系统
./start.sh
```

**configure 脚本会自动：**
- ✅ 检查 Python 和 Node.js 环境
- ✅ 检测包管理器（npm/pnpm）
- ✅ 配置端口和日志级别
- ✅ 生成环境变量文件
- ✅ 可选安装依赖

**启动选项：**
```bash
./start.sh              # 启动前后端
./start.sh --server-only  # 只启动后端
./start.sh --web-only     # 只启动前端
./start.sh --help         # 查看帮助
```

## 访问地址
- 前端界面：http://localhost:5270（可在配置时自定义）
- 后端API：http://localhost:5274（可在配置时自定义）

## 生产环境部署

### 部署到生产环境

```bash
# 运行部署脚本
./deploy.sh
```

**部署选项：**

**后端部署方式：**
1. **nohup** - 简单后台运行
2. **Gunicorn** - 推荐生产环境（多 worker 进程）
3. **systemd** - 系统服务（开机自启）

**前端部署方式：**
1. **Nginx** - 自动生成配置文件
2. **手动部署** - 构建后手动部署 dist 目录

### 服务管理

```bash
# 查看服务状态
./status.sh

# 停止所有服务
./stop.sh

# 重启 Gunicorn
kill -HUP $(cat server/gunicorn.pid)

# 查看日志
tail -f logs/server.log
tail -f logs/gunicorn_error.log
```

## 数据存储
数据存储在 SQLite 数据库中：
- `server/dbs/essu.db` - 主数据库文件