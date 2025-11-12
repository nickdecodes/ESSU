#!/bin/bash

# ============================================
# 停止服务脚本
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  停止服务"
echo "========================================"
echo ""

# 停止 nohup 后端
if [ -f "server/server.pid" ]; then
    PID=$(cat server/server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "停止 nohup 后端进程 (PID: $PID)..."
        kill $PID
        rm server/server.pid
        echo -e "${GREEN}✓${NC} 已停止"
    else
        echo -e "${YELLOW}⚠${NC} 进程不存在，清理 PID 文件"
        rm server/server.pid
    fi
fi

# 停止 Gunicorn
if [ -f "server/gunicorn.pid" ]; then
    PID=$(cat server/gunicorn.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "停止 Gunicorn 进程 (PID: $PID)..."
        kill $PID
        rm server/gunicorn.pid
        echo -e "${GREEN}✓${NC} 已停止"
    else
        echo -e "${YELLOW}⚠${NC} 进程不存在，清理 PID 文件"
        rm server/gunicorn.pid
    fi
fi

# 停止 systemd 服务
if systemctl is-active --quiet essu-server 2>/dev/null; then
    echo "停止 systemd 服务..."
    sudo systemctl stop essu-server
    echo -e "${GREEN}✓${NC} 已停止"
fi

echo ""
echo "所有服务已停止"
