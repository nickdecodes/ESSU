#!/bin/bash

# ============================================
# 服务状态检查脚本
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "  服务状态"
echo "========================================"
echo ""

# 检查 nohup 后端
if [ -f "server/server.pid" ]; then
    PID=$(cat server/server.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${GREEN}●${NC} nohup 后端服务运行中 (PID: $PID)"
    else
        echo -e "${RED}●${NC} nohup 后端服务已停止 (PID 文件存在但进程不存在)"
    fi
else
    echo -e "${YELLOW}○${NC} nohup 后端服务未运行"
fi

# 检查 Gunicorn
if [ -f "server/gunicorn.pid" ]; then
    PID=$(cat server/gunicorn.pid)
    if ps -p $PID > /dev/null 2>&1; then
        WORKERS=$(pgrep -P $PID | wc -l)
        echo -e "${GREEN}●${NC} Gunicorn 运行中 (PID: $PID, Workers: $WORKERS)"
    else
        echo -e "${RED}●${NC} Gunicorn 已停止 (PID 文件存在但进程不存在)"
    fi
else
    echo -e "${YELLOW}○${NC} Gunicorn 未运行"
fi

# 检查 systemd 服务
if systemctl is-active --quiet essu-server 2>/dev/null; then
    echo -e "${GREEN}●${NC} systemd 服务运行中"
    echo "  状态: $(systemctl is-active essu-server)"
    echo "  查看日志: sudo journalctl -u essu-server -n 20"
elif systemctl list-unit-files | grep -q essu-server 2>/dev/null; then
    echo -e "${RED}●${NC} systemd 服务已停止"
else
    echo -e "${YELLOW}○${NC} systemd 服务未配置"
fi

# 检查端口占用
echo ""
echo "端口占用情况:"
if command -v lsof &> /dev/null; then
    if lsof -i :5274 > /dev/null 2>&1; then
        echo -e "${GREEN}●${NC} 端口 5274 (后端) 正在使用"
        lsof -i :5274 | grep LISTEN
    else
        echo -e "${YELLOW}○${NC} 端口 5274 (后端) 未使用"
    fi
    
    if lsof -i :5270 > /dev/null 2>&1; then
        echo -e "${GREEN}●${NC} 端口 5270 (前端) 正在使用"
        lsof -i :5270 | grep LISTEN
    else
        echo -e "${YELLOW}○${NC} 端口 5270 (前端) 未使用"
    fi
elif command -v netstat &> /dev/null; then
    netstat -tuln | grep -E "5274|5270"
else
    echo "无法检查端口占用 (需要 lsof 或 netstat)"
fi

# 检查日志文件
echo ""
echo "日志文件:"
if [ -f "logs/server.log" ]; then
    SIZE=$(du -h logs/server.log | cut -f1)
    echo "  logs/server.log ($SIZE)"
fi
if [ -f "logs/gunicorn_access.log" ]; then
    SIZE=$(du -h logs/gunicorn_access.log | cut -f1)
    echo "  logs/gunicorn_access.log ($SIZE)"
fi
if [ -f "logs/gunicorn_error.log" ]; then
    SIZE=$(du -h logs/gunicorn_error.log | cut -f1)
    echo "  logs/gunicorn_error.log ($SIZE)"
fi

echo ""
