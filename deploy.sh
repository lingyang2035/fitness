#!/bin/bash
# ==============================================
# 家庭健身 App — 容器部署脚本
# 在远程服务器上执行
# ==============================================
set -e

# ====== 配置区（按你的实际情况修改）======
CONTAINER_NAME="替换为你的容器名"      # docker ps 查看
APP_DIR="/opt/fitness"                  # 容器内存放项目的路径
APP_PORT=9101                           # 应用端口
# ==============================================

echo "📦 步骤 1/4: 将项目文件复制到容器中..."
docker cp /tmp/fitness/ "${CONTAINER_NAME}:${APP_DIR}"

echo ""
echo "📥 步骤 2/4: 安装 Python 依赖..."
docker exec "${CONTAINER_NAME}" pip install flask waitress --break-system-packages

echo ""
echo "🔑 步骤 3/4: 生成固定密钥..."
SECRET_KEY=$(docker exec "${CONTAINER_NAME}" python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY=${SECRET_KEY}"

echo ""
echo "🚀 步骤 4/4: 启动应用 (Waitress 生产模式, 端口 ${APP_PORT})..."
echo "容器内按 Ctrl+C 停止，或者用 docker exec 启动后台进程"
echo ""
echo "============================================="
echo "  启动命令（在容器内执行）："
echo "============================================="
echo ""
echo "  cd ${APP_DIR}"
echo "  SECRET_KEY=${SECRET_KEY} python3 -c \""
echo "from waitress import serve"
echo "from app import create_app"
echo "serve(create_app(), host='0.0.0.0', port=${APP_PORT})"
echo "\""
echo ""
echo "============================================="
echo "  然后访问: http://你的服务器IP:9101"
echo "============================================="
