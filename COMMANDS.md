# 🏋️ 家庭健身 — 命令速查

## 环境信息

| 项目 | 值 |
|------|-----|
| 容器名 | `578b9aba60e6` |
| 容器端口 | `9101` |
| Nginx 容器 | `02_9078` |
| HTTPS 地址 | `https://kb01.gamutsoft.com:9078/fitness/` |
| 代码路径 | `/opt/fitness`（容器内） |
| 数据库 | `/opt/fitness/data/fitness.db`（容器内） |
| 本地代码 | `/home/lingy/lyai-project/fitness` |

---

## 📦 发版（更新代码，保留数据）

```bash
tar -czf /tmp/fitness.tar.gz -C /home/lingy/lyai-project/fitness \
  --exclude=data --exclude=.claude . && \
docker cp /tmp/fitness.tar.gz 578b9aba60e6:/tmp/ && \
docker exec 578b9aba60e6 bash -c '
  pkill -f waitress
  cd /opt/fitness
  tar -xzf /tmp/fitness.tar.gz
  nohup python3 -c "
from waitress import serve
from app import create_app
serve(create_app(), host=\"0.0.0.0\", port=9101)
" > /var/log/fitness.log 2>&1 &
  sleep 2
  ps aux | grep -v grep | grep waitress
'
```

> `--exclude=data` 是关键，不会覆盖生产数据库。

---

## 📊 查看状态

```bash
# 进程是否在跑
docker exec 578b9aba60e6 ps aux | grep -v grep | grep waitress

# HTTP 是否响应
docker exec 578b9aba60e6 curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:9101/login

# 当前模式（有无 nginx 前缀）
docker exec 578b9aba60e6 curl -s http://localhost:9101/login | grep "script.*src.*api"
```

---

## ▶️ 启动

```bash
docker exec 578b9aba60e6 bash -c '
cd /opt/fitness
nohup python3 -c "
from waitress import serve
from app import create_app
serve(create_app(), host=\"0.0.0.0\", port=9101)
" > /var/log/fitness.log 2>&1 &
sleep 2
ps aux | grep -v grep | grep waitress
'
```

---

## ⏹️ 停止

```bash
docker exec 578b9aba60e6 pkill -f waitress
```

---

## 🔄 重启（重启进程，数据不动）

```bash
docker exec 578b9aba60e6 bash -c '
pkill -f waitress
sleep 1
cd /opt/fitness
nohup python3 -c "
from waitress import serve
from app import create_app
serve(create_app(), host=\"0.0.0.0\", port=9101)
" > /var/log/fitness.log 2>&1 &
sleep 2
ps aux | grep -v grep | grep waitress
'
```

---

## 📋 查看日志

```bash
docker exec 578b9aba60e6 tail -50 /var/log/fitness.log
```

实时跟踪：
```bash
docker exec 578b9aba60e6 tail -f /var/log/fitness.log
```

---

## 🗄️ 备份数据库

```bash
docker cp 578b9aba60e6:/opt/fitness/data/fitness.db ./backup-$(date +%Y%m%d-%H%M%S).db
```

---

## 🔧 Nginx 相关

```bash
# 测试配置
docker exec 02_9078 nginx -t

# 重载配置
docker exec 02_9078 nginx -s reload

# 查看 fitness 相关配置
docker exec 02_9078 cat /etc/nginx/conf.d/9078.https.conf | sed -n '/location \/fitness/,/}/p'
```

---

## ⚠️ 注意事项

- **不要** 用 `docker cp fitness/ 容器:/opt/fitness/` 覆盖全目录，会清空数据库
- **不要** 设 `APP_PREFIX` 环境变量，前缀现在是自动检测的
- 容器重启（`docker restart`）不丢数据，只有 `docker rm` 才会丢
