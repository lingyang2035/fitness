# 🏋️ 家庭健身 — 安装部署文档

## 项目简介

家庭运动记录与统计应用，支持多人使用。参考 `code-V0.1.html` 原型开发，从单文件 localStorage 版本演进为完整的前后端应用。

**核心功能：**
- 运动记录（跑步、壶铃、拉伸、跳绳、游泳、引体向上）
- 周视图 / 个人视图 / 成员统计
- 邀请注册（生成链接分享到微信）
- 管理后台（用户管理、记录管理、操作日志）

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│                 浏览器 / 微信                   │
├─────────────────────────────────────────────┤
│  前端: Jinja2 模板 + Tailwind CSS + 原生 JS    │
│  后端: Flask (Python)                         │
│  数据库: SQLite (WAL 模式)                     │
│  认证: Flask Session (签名 Cookie)             │
└─────────────────────────────────────────────┘
```

**单体应用，非前后端分离。** 一个 Python 进程同时提供页面渲染和 API 接口。

**依赖（仅 2 个包）：**
- `flask` — Web 框架
- `waitress` — 生产级 WSGI 服务器（可选）

SQLite 是 Python 内置模块，无需额外安装。

---

## 工程结构

```
fitness/
│
├── run.py                          # ★ 启动入口（只需运行这个文件）
├── requirements.txt                # Python 依赖
│
├── app/                            # 应用主包
│   ├── __init__.py                 # Flask 应用工厂、路由注册
│   ├── config.py                   # 配置（密钥、数据库路径、日志保留天数）
│   ├── db.py                       # 数据库建表、种子数据、连接管理
│   ├── auth.py                     # 密码哈希、登录装饰器、权限校验
│   ├── utils.py                    # 工具函数（周计算、操作日志记录）
│   │
│   ├── models/                     # 数据访问层
│   │   ├── users.py                # 用户 CRUD、认证
│   │   ├── records.py              # 运动记录 CRUD、统计
│   │   ├── invites.py              # 邀请令牌管理
│   │   └── logs.py                 # 访问日志查询
│   │
│   ├── routes/                     # 路由层
│   │   ├── main.py                 # 页面路由（/, /app, /admin, /login 等）
│   │   ├── auth.py                 # 认证 API（/api/auth/*）
│   │   ├── records.py              # 记录 API（/api/records/*）
│   │   ├── stats.py                # 统计 API（/api/stats）
│   │   ├── invite.py               # 邀请 API（/api/invite/*）
│   │   └── admin.py                # 管理 API（/api/admin/*）
│   │
│   └── templates/                  # Jinja2 页面模板
│       ├── base.html               # 基础布局（OG 元标签、PWA、Tailwind CDN）
│       ├── setup.html              # 首次初始化页
│       ├── login.html              # 登录页
│       ├── register.html           # 邀请注册页
│       ├── app.html                # ★ 主应用页（运动记录）
│       └── admin.html              # ★ 管理后台
│
├── static/                         # 静态资源
│   ├── js/
│   │   ├── api.js                  # 前端 API 客户端封装
│   │   ├── app.js                  # 主应用逻辑
│   │   └── admin.js                # 管理后台逻辑
│   ├── manifest.json               # PWA 清单（可添加到手机桌面）
│   ├── sw.js                       # Service Worker（离线缓存）
│   ├── icon-192.png                # PWA 小图标
│   └── icon-512.png                # PWA 大图标
│
├── data/                           # SQLite 数据库文件（运行时自动创建）
│   └── fitness.db                  # 主数据库文件
│
├── code-V0.1.html                  # 原始单文件原型（参考用）
└── readme.txt                      # 需求说明
```

---

## 数据库表结构

```sql
families          -- 家庭分组
users             -- 用户：username, password_hash, display_name, role(admin/member)
exercise_types    -- 运动类型：name, unit(km/count), icon, sort_order
exercise_records  -- 运动记录：user_id, exercise_type, duration_minutes, quantity, week_start
invite_tokens     -- 邀请令牌：token(UUID), created_by, is_used, expires_at
access_logs       -- 操作日志：user_id, action, details, ip_address, created_at
settings          -- 系统设置键值对
```

---

## 部署方式

### 方式一：Linux 服务器部署（⭐ 推荐）

适用场景：云服务器、VPS、物理机、树莓派等，需要应用长期稳定运行。

#### 1. 环境准备

```bash
# 确认 Python 版本 >= 3.10
python3 --version

# Ubuntu/Debian 安装 pip（如果没有）
sudo apt update
sudo apt install python3-pip -y

# CentOS/RHEL/Fedora
sudo yum install python3-pip -y
```

#### 2. 上传项目

```bash
# 把整个 fitness 目录上传到服务器，例如 /opt/fitness
scp -r fitness/ user@你的服务器IP:/opt/
```

#### 3. 安装依赖

```bash
cd /opt/fitness
pip install flask waitress --break-system-packages
```

#### 4. 设置环境变量

```bash
# 生成一个固定密钥（否则每次重启 Session 都会失效）
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# 写入系统环境变量
sudo tee /etc/fitness-env <<EOF
SECRET_KEY=${SECRET_KEY}
DATABASE_PATH=/opt/fitness/data/fitness.db
EOF

# 权限收紧：数据库目录和日志只让 root 和 app 读
chmod 600 /etc/fitness-env
```

#### 5. 创建 systemd 服务（开机自启 + 崩溃自动重启）

```bash
sudo tee /etc/systemd/system/fitness.service <<'EOF'
[Unit]
Description=家庭健身 Fitness App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/fitness
EnvironmentFile=/etc/fitness-env
ExecStart=/usr/bin/python3 -c "from waitress import serve; from app import create_app; serve(create_app(), host='0.0.0.0', port=5000)"
Restart=always
RestartSec=5
StandardOutput=append:/var/log/fitness.log
StandardError=append:/var/log/fitness-error.log

[Install]
WantedBy=multi-user.target
EOF
```

#### 6. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable fitness          # 开机自启
sudo systemctl start fitness           # 立即启动

# 查看状态
sudo systemctl status fitness
```

#### 7. 防火墙放行端口

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 5000/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --add-port=5000/tcp --permanent
sudo firewall-cmd --reload
```

> 如果你的服务器在云上（阿里云/腾讯云/AWS 等），还需要在**安全组**里放行 5000 端口。

#### 8. 访问

```
http://你的服务器IP:5000
```

---

### 方式二：Nginx 反向代理（可选，更安全）

如果你有域名或者想用 80/443 端口，可以在前面加一层 Nginx：

```bash
# 安装 Nginx
sudo apt install nginx -y

# 添加配置
sudo tee /etc/nginx/sites-available/fitness <<'EOF'
server {
    listen 80;
    server_name your-domain.com;   # 改成你的域名或 IP

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/fitness /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

配置 HTTPS（使用 Let's Encrypt 免费证书）：

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

### 方式三：直接运行（开发/临时测试）

```bash
cd fitness
pip install flask --break-system-packages
python3 run.py
# 访问 http://localhost:5000
```

> Flask 内置服务器**不适合生产使用**，仅用于本地调试。

---

### 方式四：Docker 部署

```dockerfile
FROM python:3.14-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --break-system-packages

COPY . .

RUN mkdir -p /app/data
ENV DATABASE_PATH=/app/data/fitness.db

EXPOSE 5000
CMD ["sh", "-c", "python3 -c \"from waitress import serve; from app import create_app; serve(create_app(), host='0.0.0.0', port=${PORT:-5000})\""]
```

```bash
docker build -t family-fitness .
docker run -d -p 5000:5000 -v $(pwd)/data:/app/data --name fitness family-fitness
```

---

## 日常运维

### 常用命令

```bash
# 查看服务状态
systemctl status fitness

# 停止 / 启动 / 重启
systemctl stop fitness
systemctl start fitness
systemctl restart fitness

# 查看日志
tail -f /var/log/fitness.log
tail -f /var/log/fitness-error.log

# 查看最近 50 条日志
journalctl -u fitness -n 50 --no-pager
```

### 备份数据

```bash
# 数据库就是一个文件，直接复制即可
cp /opt/fitness/data/fitness.db /backup/fitness-$(date +%Y%m%d).db

# 建议加入 crontab 每天自动备份
echo "0 3 * * * cp /opt/fitness/data/fitness.db /backup/fitness-\$(date +\%Y\%m\%d).db" | crontab -
```

### 更新应用

```bash
# 1. 上传新代码覆盖 /opt/fitness/
# 2. 重启服务
sudo systemctl restart fitness
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SECRET_KEY` | Flask Session 签名密钥 | 自动随机生成 |
| `DATABASE_PATH` | SQLite 数据库文件路径 | `./data/fitness.db` |

> **⚠️ 重要：** 生产环境必须设置固定的 `SECRET_KEY`，否则每次重启所有用户 Session 失效，需要重新登录。上面的 systemd 部署步骤已包含此项。

---

## 使用流程

### 首次使用

1. 浏览器打开 `http://你的服务器:5000`
2. 自动跳转到初始化页面，创建管理员账号
3. 进入主应用，开始记录运动

### 邀请家人

1. 在主应用中点击「+ 邀请家人」
2. 生成邀请链接，复制发送到微信群
3. 家人点击链接 → 填写信息注册 → 自动加入

### 管理后台

- 管理员登录后，点击右上角齿轮图标进入 `/admin`
- 功能：用户管理、记录查看、操作日志、邀请管理

---

## 常见问题

**Q: 数据库在哪？**
A: `data/fitness.db`，SQLite 单文件，可直接用 sqlite3 命令查看。

**Q: 如何备份？**
A: 直接复制 `data/fitness.db` 文件即可。

**Q: 忘记管理员密码怎么办？**
A: 删除 `data/fitness.db` 重新初始化，或通过 sqlite3 手动重置。

**Q: 微信里打开样式不对？**
A: 微信内置浏览器基于 Chrome Blink 内核，Tailwind CSS 完全兼容。已配置 OG 元标签用于分享卡片。
