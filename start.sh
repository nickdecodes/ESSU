#!/bin/bash

echo "启动电商出入库系统..."

# 检查并安装前端依赖
echo "检查前端依赖..."
cd web
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi
cd ..

# 启动Python后端
echo "启动Python后端服务器..."
cd server
python main.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动React前端
echo "启动React前端..."
cd web
pnpm start &
FRONTEND_PID=$!
cd ..

echo "系统启动完成!"
echo "后端服务: http://localhost:5274"
echo "前端界面: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
wait

# 清理进程
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null