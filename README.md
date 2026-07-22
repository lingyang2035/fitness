# 🏅 FamFit日记

和家人一起记录运动，健康生活。

## 功能

- 🏃 **18 种运动类型**：跑步、游泳、壶铃、引体向上、拉伸、瑜伽、跳绳、球类、吊单杠、靠墙站立、徒步、走路、爬山、羽毛球、骑车、跟炼、力量
- 📊 **周/月视图切换**：本周摘要卡片 + 统计页（成员排行、运动分布、每日时长柱状图）
- 👨‍👩‍👧‍👦 **家庭成员模式**：邀请码注册，各自独立记录，支持删除自己或家人的记录
- 📱 **iOS 风格交互**：逐项填写模式，滚轮选择时长，侧滑面板选择运动类型
- 🔒 **管理后台**：用户管理、记录管理、操作日志
- 🌐 **子路径部署**：支持 `/fitness/` 反向代理，自动检测路径前缀
- 📲 **PWA**：可添加到主屏幕，Service Worker 离线缓存

## 技术栈

| 层 | 技术 | 说明 |
|------|------|------|
| 后端框架 | Python 3 + Flask 3.x | 应用工厂模式，Blueprint 路由 |
| WSGI | Waitress | 生产环境多线程服务 |
| 数据库 | SQLite | 单文件，零配置，WAL 模式 |
| CSS | Tailwind CSS 3.4 | 通过 CLI 编译，按需生成 |
| JS | Vanilla JS (ES6) | 无框架，直接操作 DOM |
| 图标 | Lucide Icons | CDN 加载，按需替换 |
| PWA | Service Worker | 动态生成 sw.js，版本化缓存 |
| 反向代理 | Nginx | HTTPS 终端 + 子路径 `/fitness/` |

## 项目结构

```
fitness/
├── run.py                  # 开发入口，Flask dev server
├── requirements.txt        # Python 依赖
├── tailwind.config.js      # Tailwind 主题配置
├── build_css.sh            # Tailwind CSS 编译脚本
├── app/
│   ├── __init__.py         # 应用工厂 + 中间件 + 蓝图注册
│   ├── config.py           # 配置（数据库路径、Session、安全）
│   ├── auth.py             # 认证装饰器 + 密码哈希
│   ├── db.py               # SQLite 连接 + 表初始化
│   ├── utils.py            # 分页、工具函数
│   ├── models/
│   │   ├── users.py        # 用户 CRUD
│   │   ├── records.py      # 运动记录 CRUD
│   │   ├── invites.py      # 邀请码 CRUD
│   │   └── logs.py         # 操作日志
│   ├── routes/
│   │   ├── main.py         # 首页、app 页面
│   │   ├── auth.py         # 登录、注册、登出
│   │   ├── records.py      # 运动记录 API
│   │   ├── stats.py        # 统计 API
│   │   ├── invite.py       # 邀请码 API
│   │   └── admin.py        # 管理后台页面 + API
│   └── templates/
│       ├── base.html       # 基础布局 + Safari 14 兼容 hack
│       ├── app.html        # 主应用页面
│       ├── login.html      # 登录页
│       ├── register.html   # 注册页
│       ├── admin.html      # 管理后台
│       └── setup.html      # 初始化设置
└── static/
    ├── css/
    │   ├── input.css       # Tailwind 源文件
    │   └── tailwind.css    # 编译输出
    └── js/
        ├── api.js          # API 请求封装
        ├── app.js          # 主应用逻辑
        └── admin.js        # 管理后台逻辑
```

## 本地开发

```bash
pip install -r requirements.txt
python3 run.py
# → http://localhost:5000
```

## 生产部署

打包、上传、重启流程详见 **[doc/fitness_deploy.md](doc/fitness_deploy.md)**。

快速参考：

```bash
# 本地打包
tar -czf /tmp/fitness-release.tar.gz \
  --exclude='.git' --exclude='.claude' --exclude='data' \
  --exclude='__pycache__' --exclude='*.pyc' --exclude='*.db' \
  --exclude='node_modules' --exclude='doc' \
  --exclude='.gitignore' --exclude='static/css/input.css' \
  --exclude='static/mockup.png' --exclude='build_css.sh' \
  -C /home/lingy/lyai-project/fitness .

# 服务器部署
pkill -f waitress
tar -xzf /tmp/fitness-release.tar.gz -C /opt/fitness
export SESSION_SECURE=1
nohup python3 -c "
from waitress import serve
from app import create_app
serve(create_app(), host='0.0.0.0', port=9101)
" > /var/log/fitness.log 2>&1 &
```

## 设计原则

- **SSOT**：应用名称、emoji 等元数据在 `app/__init__.py` 一处定义，模板通过 `app_prefix` 上下文全局生效
- **子路径自动检测**：通过 `X-Forwarded-Prefix` 请求头（Nginx 注入）自动适配 `/fitness/` 前缀，无需环境变量
- **无前端构建**：不依赖 Webpack/Vite，Tailwind CLI 一次性编译 CSS，JS 原生 ES6
- **渐进增强**：iOS 14.4 兼容（flex gap 回退、transform CSS 变量回退、inset 简写回退）

## iOS 14 兼容

项目专门处理了 iOS 14.4.x（Safari 14.0.x / WebKit）的两个兼容问题：

| 问题 | Safari 版本 | 修复方式 |
|------|------------|---------|
| CSS 变量在 `transform` 中被忽略 | < 14.1 | `.safari14` 类回退为直接值 `translateY(100%)` 等 |
| `inset` 简写属性不支持 | < 14.1 | `.safari14 .inset-0` 展开为 `top/right/bottom/left: 0` |

UA 检测脚本在 `base.html` 中，检测到 Safari < 14.1 时给 `<html>` 添加 `safari14` 类。

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.1.5.1 | 2026-07-22 | iOS 14.4 `inset-0` 兼容修复 — 类型面板遮挡根因 |
| V1.1.5 | 2026-07-21 | Safari 14 transform CSS 变量回退 + 类型面板遮挡修复 |
| V1.1.4 | 2026-07-21 | iOS 14.4 flex gap 兼容 + 类型面板 translate-x-full 修复 |
| V1.1.3 | 2026-07-21 | 周/月视图切换 + 统计页重设计 + 品牌更名为 FamFit日记 |
| V1.1.2 | 2026-07 | 新增跟炼和力量运动类型 |
| V1.1.1 | 2026-07 | iOS 14.4 兼容 + 新增运动类型 + 安全加固 |
| V1.1.0 | 2026-07 | 安全加固 + 用户管理重构 + 文档整理 |
| V1.0.x | 2026-06~07 | 早期版本迭代 |
