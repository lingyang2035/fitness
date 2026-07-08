#!/bin/bash
# =============================================
# 锻炼日记 — 一键发版脚本
# 用法: bash deploy.sh
# =============================================
set -e

CONTAINER="578b9aba60e6"
APP_DIR="/opt/fitness"
PORT="9101"
BUNDLE="/tmp/fitness-deploy.tar.gz"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📦 打包代码 (排除 .git .claude data __pycache__)..."
tar -czf "$BUNDLE" -C "$LOCAL_DIR" \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='data' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.db' \
  --exclude='.gitignore' \
  --exclude='deploy.sh' \
  .

echo "🚀 上传到容器 $CONTAINER..."
docker cp "$BUNDLE" "$CONTAINER:/tmp/"

echo "🔄 解压并重启服务..."
docker exec "$CONTAINER" bash -c "
  pkill -f waitress 2>/dev/null || true
  sleep 0.5
  cd $APP_DIR
  tar -xzf /tmp/fitness-deploy.tar.gz
  nohup python3 -c \"
from waitress import serve
from app import create_app
serve(create_app(), host='0.0.0.0', port=$PORT)
\" > /var/log/fitness.log 2>&1 &
  sleep 1
  if pgrep -f waitress > /dev/null; then
    echo '✅ 发版成功 — waitress 已启动'
  else
    echo '❌ 发版失败 — 检查 /var/log/fitness.log'
    exit 1
  fi
"

rm -f "$BUNDLE"
echo "✨ 完成"
