#!/bin/bash

# ============================================
# 电商出入库系统 - 生产环境部署脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "  生产环境部署"
echo "========================================"
echo ""

# 检查配置文件
if [ ! -f "config.sh" ]; then
    echo -e "${RED}错误: 未找到配置文件${NC}"
    echo "请先运行 ./configure 进行配置"
    exit 1
fi

source config.sh

# 询问部署类型
echo "请选择部署方式:"
echo "  1) 完整部署（前端 + 后端）"
echo "  2) 仅部署后端"
echo "  3) 仅部署前端"
read -r deploy_choice

DEPLOY_SERVER=false
DEPLOY_WEB=false

case $deploy_choice in
    1)
        DEPLOY_SERVER=true
        DEPLOY_WEB=true
        ;;
    2)
        DEPLOY_SERVER=true
        ;;
    3)
        DEPLOY_WEB=true
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac

# ============================================
# 部署后端
# ============================================
if [ "$DEPLOY_SERVER" = true ]; then
    echo ""
    echo "========================================"
    echo "  部署后端服务"
    echo "========================================"
    
    # 生成生产环境配置
    if [ ! -f "server/.env.production" ]; then
        echo "生成生产环境配置..."
        cat > server/.env.production << EOF
# 生产环境配置
LOG_LEVEL=WARNING
DEBUG=False
HOST=0.0.0.0
PORT=${SERVER_PORT}
EOF
        echo -e "${GREEN}✓${NC} 已生成 server/.env.production"
    fi
    
    # 询问部署方式
    echo ""
    echo "选择后端部署方式:"
    echo "  1) nohup 后台运行"
    echo "  2) Gunicorn (推荐生产环境)"
    echo "  3) systemd 服务"
    read -r server_deploy_type
    
    case $server_deploy_type in
        1)
            # nohup 部署
            echo "使用 nohup 部署后端..."
            cd server
            
            # 停止旧进程
            if [ -f "server.pid" ]; then
                OLD_PID=$(cat server.pid)
                if ps -p $OLD_PID > /dev/null 2>&1; then
                    echo "停止旧进程 (PID: $OLD_PID)..."
                    kill $OLD_PID
                    sleep 2
                fi
            fi
            
            # 启动新进程
            nohup $PYTHON_CMD main.py > ../logs/server.log 2>&1 &
            echo $! > server.pid
            echo -e "${GREEN}✓${NC} 后端服务已启动 (PID: $!)"
            echo "  日志文件: logs/server.log"
            echo "  PID 文件: server/server.pid"
            cd ..
            ;;
            
        2)
            # Gunicorn 部署
            echo "使用 Gunicorn 部署后端..."
            
            # 检查 Gunicorn
            if ! $PYTHON_CMD -m pip show gunicorn > /dev/null 2>&1; then
                echo "安装 Gunicorn..."
                cd server
                $PYTHON_CMD -m pip install gunicorn
                cd ..
            fi
            
            # 生成 Gunicorn 配置
            cat > server/gunicorn.conf.py << 'EOF'
import multiprocessing

# 服务器配置
bind = "0.0.0.0:5274"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# 日志配置
accesslog = "../logs/gunicorn_access.log"
errorlog = "../logs/gunicorn_error.log"
loglevel = "info"

# 进程命名
proc_name = "essu_server"

# 守护进程
daemon = True
pidfile = "gunicorn.pid"

# 优雅重启
graceful_timeout = 30
EOF
            
            cd server
            
            # 停止旧进程
            if [ -f "gunicorn.pid" ]; then
                OLD_PID=$(cat gunicorn.pid)
                if ps -p $OLD_PID > /dev/null 2>&1; then
                    echo "停止旧进程 (PID: $OLD_PID)..."
                    kill $OLD_PID
                    sleep 2
                fi
            fi
            
            # 启动 Gunicorn
            $PYTHON_CMD -m gunicorn -c gunicorn.conf.py main:app
            echo -e "${GREEN}✓${NC} Gunicorn 已启动"
            echo "  配置文件: server/gunicorn.conf.py"
            echo "  PID 文件: server/gunicorn.pid"
            echo "  访问日志: logs/gunicorn_access.log"
            echo "  错误日志: logs/gunicorn_error.log"
            cd ..
            ;;
            
        3)
            # systemd 服务
            echo "配置 systemd 服务..."
            
            WORK_DIR=$(pwd)
            
            cat > /tmp/essu-server.service << EOF
[Unit]
Description=ESSU Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$WORK_DIR/server
Environment="PATH=$PATH"
ExecStart=$PYTHON_CMD $WORK_DIR/server/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            
            echo "需要 sudo 权限安装 systemd 服务"
            sudo mv /tmp/essu-server.service /etc/systemd/system/
            sudo systemctl daemon-reload
            sudo systemctl enable essu-server
            sudo systemctl start essu-server
            
            echo -e "${GREEN}✓${NC} systemd 服务已配置"
            echo "  启动: sudo systemctl start essu-server"
            echo "  停止: sudo systemctl stop essu-server"
            echo "  重启: sudo systemctl restart essu-server"
            echo "  状态: sudo systemctl status essu-server"
            echo "  日志: sudo journalctl -u essu-server -f"
            ;;
    esac
fi

# ============================================
# 部署前端
# ============================================
if [ "$DEPLOY_WEB" = true ]; then
    echo ""
    echo "========================================"
    echo "  部署前端应用"
    echo "========================================"
    
    # 生成生产环境配置
    echo "请输入生产环境后端 API 地址 (例如: http://your-domain.com:5274):"
    read -r prod_api_url
    
    cat > web/.env.production << EOF
# 生产环境配置
VITE_API_BASE_URL=${prod_api_url}
VITE_APP_TITLE=电商出入库系统
EOF
    
    echo -e "${GREEN}✓${NC} 已生成 web/.env.production"
    
    # 构建前端
    echo ""
    echo "构建前端应用..."
    cd web
    $PACKAGE_MANAGER run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗${NC} 前端构建失败"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} 前端构建成功"
    echo "  构建目录: web/dist"
    cd ..
    
    # 询问部署方式
    echo ""
    echo "选择前端部署方式:"
    echo "  1) 生成 Nginx 配置"
    echo "  2) 仅构建（手动部署）"
    read -r web_deploy_type
    
    case $web_deploy_type in
        1)
            # 生成 Nginx 配置
            echo ""
            echo "请输入域名 (例如: example.com，留空使用 localhost):"
            read -r domain_name
            domain_name=${domain_name:-localhost}
            
            cat > nginx.conf << EOF
server {
    listen 80;
    server_name ${domain_name};
    
    # 前端静态文件
    root $(pwd)/web/dist;
    index index.html;
    
    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:${SERVER_PORT}/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
EOF
            
            echo -e "${GREEN}✓${NC} 已生成 Nginx 配置文件: nginx.conf"
            echo ""
            echo "部署步骤:"
            echo "  1. 复制配置到 Nginx:"
            echo "     sudo cp nginx.conf /etc/nginx/sites-available/essu"
            echo "     sudo ln -s /etc/nginx/sites-available/essu /etc/nginx/sites-enabled/"
            echo ""
            echo "  2. 测试配置:"
            echo "     sudo nginx -t"
            echo ""
            echo "  3. 重启 Nginx:"
            echo "     sudo systemctl restart nginx"
            ;;
            
        2)
            echo ""
            echo "前端已构建完成，请手动部署 web/dist 目录"
            ;;
    esac
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""

if [ "$DEPLOY_SERVER" = true ]; then
    echo "后端服务:"
    echo "  地址: http://localhost:${SERVER_PORT}"
    echo "  日志: logs/server.log 或 logs/gunicorn_*.log"
fi

if [ "$DEPLOY_WEB" = true ]; then
    echo "前端应用:"
    echo "  构建目录: web/dist"
    if [ "$web_deploy_type" = "1" ]; then
        echo "  访问地址: http://${domain_name}"
    fi
fi

echo ""
