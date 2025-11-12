#!/bin/bash

# 检查是否已配置
if [ ! -f "config.sh" ]; then
    echo "错误: 未找到配置文件"
    echo "请先运行 ./configure 进行配置"
    exit 1
fi

# 加载配置
source config.sh

# 使用配置文件中的设置作为默认值
START_SERVER=$SETUP_SERVER
START_WEB=$SETUP_WEB

# 解析命令行参数（可以覆盖配置）
while [[ $# -gt 0 ]]; do
    case $1 in
        --server-only)
            START_SERVER=true
            START_WEB=false
            shift
            ;;
        --web-only)
            START_SERVER=false
            START_WEB=true
            shift
            ;;
        --help|-h)
            echo "用法: ./start.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --server-only    只启动后端服务"
            echo "  --web-only       只启动前端服务"
            echo "  --help, -h       显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  ./start.sh                启动前后端"
            echo "  ./start.sh --server-only  只启动后端"
            echo "  ./start.sh --web-only     只启动前端"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

echo "========================================"
echo "    启动电商出入库系统"
echo "========================================"
echo ""

BACKEND_PID=""
FRONTEND_PID=""

# 启动后端服务
if [ "$START_SERVER" = true ]; then
    echo "📦 启动后端服务..."
    
    if [ ! -d "$SERVER_DIR" ]; then
        echo "✗ 错误: 后端目录 $SERVER_DIR 不存在"
        exit 1
    fi
    
    cd "$SERVER_DIR"
    
    # 检查环境变量文件
    if [ -f "$SERVER_ENV_FILE" ]; then
        echo "  ✓ 找到环境变量文件: $SERVER_ENV_FILE"
    else
        echo "  ⚠ 未找到环境变量文件: $SERVER_ENV_FILE"
    fi
    
    # 启动后端
    $PYTHON_CMD $SERVER_MAIN &
    BACKEND_PID=$!
    
    if [ $? -eq 0 ]; then
        echo "  ✓ 后端服务已启动 (PID: $BACKEND_PID)"
    else
        echo "  ✗ 后端服务启动失败"
        exit 1
    fi
    
    cd ..
    
    # 等待后端启动
    echo "  ⏳ 等待后端服务启动 (${BACKEND_WAIT_TIME}秒)..."
    sleep $BACKEND_WAIT_TIME
else
    echo "⊘ 跳过后端服务启动"
fi

echo ""

# 启动前端服务
if [ "$START_WEB" = true ]; then
    echo "🌐 启动前端服务..."
    
    if [ ! -d "$WEB_DIR" ]; then
        echo "✗ 错误: 前端目录 $WEB_DIR 不存在"
        [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    cd "$WEB_DIR"
    
    # 检查并安装依赖
    if [ ! -d "node_modules" ]; then
        echo "  📥 安装前端依赖..."
        $PACKAGE_MANAGER install
        if [ $? -ne 0 ]; then
            echo "  ✗ 前端依赖安装失败"
            cd ..
            [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
    else
        echo "  ✓ 前端依赖已存在"
    fi
    
    # 启动前端
    $PACKAGE_MANAGER $WEB_START_COMMAND &
    FRONTEND_PID=$!
    
    if [ $? -eq 0 ]; then
        echo "  ✓ 前端服务已启动 (PID: $FRONTEND_PID)"
    else
        echo "  ✗ 前端服务启动失败"
        [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    cd ..
else
    echo "⊘ 跳过前端服务启动"
fi

echo ""
echo "========================================"
echo "    系统启动完成！"
echo "========================================"

if [ "$START_SERVER" = true ]; then
    echo "📦 后端服务: http://localhost:5274"
fi

if [ "$START_WEB" = true ]; then
    echo "🌐 前端界面: http://localhost:5270"
fi

echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 清理函数
cleanup() {
    echo ""
    echo "========================================"
    echo "    正在停止服务..."
    echo "========================================"
    
    if [ -n "$BACKEND_PID" ]; then
        echo "⏹ 停止后端服务 (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo "⏹ 停止前端服务 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo "✓ 所有服务已停止"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 等待用户中断
wait