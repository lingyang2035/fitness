# 🏅 锻炼日记

和家人一起记录运动，健康生活。

## 功能

- 🏃 多种运动类型：跑步、游泳、跳绳、壶铃、拉伸、引体向上、吊单杠、靠墙站立
- 📊 本周摘要卡片：每人运动时长、次数、距离一目了然
- 👨‍👩‍👧‍👦 家庭成员模式：邀请码注册，各自独立记录
- 📱 iOS 风格交互：逐项填写模式，滚轮选择时长
- 🔒 管理后台：用户管理、记录管理、操作日志
- 🌐 子路径部署：支持 `/fitness/` 反向代理

## 技术栈

| 层 | 技术 |
|------|------|
| 后端 | Python Flask + Waitress |
| 数据库 | SQLite |
| 前端 | Tailwind CSS + Vanilla JS |
| 图标 | Lucide Icons |
| 部署 | Nginx 反向代理 + 子路径 + HTTPS |

## 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
python3 run.py
# → http://localhost:5000
```

## 生产部署

详见 [doc/fitness_deploy.md](doc/fitness_deploy.md)

## 版本历史

详见 [git log](https://github.com/lingyang2035/fitness/commits/master)
