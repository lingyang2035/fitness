# CLAUDE.md — FamFit日记

行为准则见全局 `~/.claude/CLAUDE.md`。

## iOS 14 兼容
目标设备 iPhone XS iOS 14.4.2（WebKit）。

**⚠️ 测试设备 ≠ 目标设备**：用户另一台 **iPhone 14 Pro**（现代 iOS）也在用，两台都要保证可用。
- 同一现象在两台上**可能表现不同**，排查兼容问题前**先确认是在哪台设备上出现的**
- **不要从本文件的"目标设备"反推用户的测试环境** —— 曾因此误判：把 iPhone 14 Pro 上的现象
  归因成 iOS 14 的固有限制，从而否掉了一个本来可用的修法
- 反之，也不要因一次现代设备上的失败就下调 iOS 14 的兼容标准（那台 XS 仍在使用）

已知陷阱：
- CSS 变量在 `transform` 中会被忽略（`var(--tw-translate-x)` → 整个 transform 无效）
- `inset` 简写属性不支持（需展开为 `top/right/bottom/left`）
- flex `gap` 不支持（已通过 `.safari14` 类用 margin 回退）
- **UA 检测按 iOS 版本（< 15），不要按 Safari 浏览器判断** — iOS 上所有浏览器（Safari/Chrome/WebView）强制共用同一 WebKit，CSS bug 完全一样。曾经因为用户用非 Safari 浏览器导致 UA 检测漏过、所有兼容修复未生效。
- 检测脚本在 `base.html` head 中，body 底部另有 safety net 兜底

## 项目速查

- **本地启动**：`python3 run.py` → http://localhost:5000（Flask 开发服务器，默认 `FLASK_DEBUG=0`，**不自动重载**，改完需重启）
- **生产部署**：流程以 `doc/fitness_deploy.md` 为准（打包 → SFTP 上传 → 服务器备份 → 解压 → 重启 → 验证），包名 `fitness-release-<版本号>-<月日>.tar.gz` 全程同名。打包命令见部署指南第 1 步
- **版本号**：`app/templates/app.html`（小写 `v1.1.x`）和 `login.html`（大写 `V1.1.x`）中各有一处，grep 注意大小写
- **应用元数据**：`app/__init__.py` 顶部的 `APP_NAME` 等常量（SSOT）

## 改前端必做

- **新增/修改 Tailwind class 后必须 `npm run build:css`**：Tailwind 只编译模板和 JS 里出现过的 class，漏编译则样式静默失效（不报错，只是样式不对）。自查脚本见 `doc/handover-用户运动明细.md` 附录
- **改 `app.js` / `api.js` / `tailwind.css` 后必须重启服务**：`build_ts`（三者 mtime 最大值）只在 `create_app()` 时计算一次，不重启则 `?v=` 不变，手机仍吃旧缓存

## 验证与发布纪律

- **无自动化测试**：验证靠实际运行（`python3 run.py` + 两台手机 / curl）
- **发布后必做**：在 `doc/fitness_deploy.md` 的「发布记录」追加一条，更新其顶部「当前生产版本」，打 git tag，并更新 README 版本历史

## 文档索引（`doc/` 不入 git，仅本机）

- `doc/fitness_deploy.md`：生产部署指南（环境、发版流程、回滚、发布记录）
- `doc/handover-用户运动明细.md`：V1.1.6 弹层功能交接、踩坑、Tailwind 自查脚本
- `doc/firewall_set_0623.md`：WSL2 端口转发开关（手机连本机服务）
- `doc/archive/`：过期的历史文档，**不是现状**

## 已知问题（未修）

- `app/__init__.py` 的缓存头只匹配 `application/javascript`，而本机 Python 3.14 把 `.js` 识别为 `text/javascript`，导致 JS 实际是 `no-cache`（生产 Python 版本未核实）
- `/sw.js` 动态路由是死代码（页面启动时会注销 Service Worker）
- `/api/records` 的 `user_id` 参数无归属校验；点自己头像也会弹出只读面板（见 handover 未决项）
