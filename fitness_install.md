# Family Fitness App — 容器部署指南

## 目标环境

- Debian 13 (trixie)
- Python 3.11.15
- 端口 9100 已被占用，本应用使用 **9101**

---

## 一、上传项目

将整个 `fitness/` 目录上传到容器的 `/opt/fitness/`，确保 `run.py` 路径为：

```
/opt/fitness/run.py
```

---

## 二、进入容器

SSH 登录到容器后执行以下步骤。

---

## 三、安装依赖

```bash
pip install flask waitress --break-system-packages
```

---

## 四、启动应用

```bash
cd /opt/fitness

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))") \
  nohup python3 -c "
from waitress import serve
from app import create_app
serve(create_app(), host='0.0.0.0', port=9101)
" > /var/log/fitness.log 2>&1 &
```

> **注意：** 记下生成的 `SECRET_KEY`，以后重启时复用同一个值，否则用户 Session 全部失效。

---

## 五、验证

```bash
sleep 2 && curl http://localhost:9101
```

返回 HTML 页面即为成功。

---

## 六、访问

浏览器打开：

```
http://你的服务器IP:9101
```

---

## 运维命令

```bash
# 查看应用日志
tail -f /var/log/fitness.log

# 查看端口是否在监听
ss -tlnp | grep 9101

# 停止应用
kill $(ss -tlnp | grep 9101 | grep -oP 'pid=\K[0-9]+')

# 重新启动（使用固定的 SECRET_KEY）
cd /opt/fitness
SECRET_KEY=你的固定密钥 \
  nohup python3 -c "
from waitress import serve
from app import create_app
serve(create_app(), host='0.0.0.0', port=9101)
" > /var/log/fitness.log 2>&1 &
```
