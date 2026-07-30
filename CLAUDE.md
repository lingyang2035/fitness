# CLAUDE.md — FamFit日记

行为准则见全局 `~/.claude/CLAUDE.md`。

## iOS 14 兼容
目标设备 iPhone XS iOS 14.4.2（WebKit）。已知陷阱：
- CSS 变量在 `transform` 中会被忽略（`var(--tw-translate-x)` → 整个 transform 无效）
- `inset` 简写属性不支持（需展开为 `top/right/bottom/left`）
- flex `gap` 不支持（已通过 `.safari14` 类用 margin 回退）
- **UA 检测按 iOS 版本（< 15），不要按 Safari 浏览器判断** — iOS 上所有浏览器（Safari/Chrome/WebView）强制共用同一 WebKit，CSS bug 完全一样。曾经因为用户用非 Safari 浏览器导致 UA 检测漏过、所有兼容修复未生效。
- 检测脚本在 `base.html` head 中，body 底部另有 safety net 兜底

## 项目速查

- **本地启动**：`python3 run.py` → http://localhost:5000（Flask 开发服务器，模板自动重载）
- **生产部署**：打包 → SFTP 上传 → 服务器 `pkill -f waitress` → 解压 → 重启（详见 `doc/fitness_deploy.md`）
- **打包命令**：见 README.md 生产部署章节，排除非运行时文件
- **版本号**：`app/templates/app.html` 和 `login.html` 中各有一处
- **应用元数据**：`app/__init__.py` 顶部的 `APP_NAME` 等常量（SSOT）
