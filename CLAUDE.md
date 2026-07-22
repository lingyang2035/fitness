# CLAUDE.md — FamFit日记

## 行为准则

### 1. 先想再做
执行任何修改前先评估：设计合理吗？有没有更好的方式？看到散弹式修改、硬编码、重复代码要主动指出。把每一次修改当作工程决策，而非打字任务。

### 2. 验证，不凭信心
- **改之前**：验证工具链假设（CSS 兼容性、API 参数、浏览器支持）
- **改之后**：实际跑起来确认（curl 页面、curl 接口、浏览器看一眼）
- **没亲眼看到结果 = 没做完**，不要说"应该可以了"

### 3. iOS 14 兼容
目标设备 iPhone XS iOS 14.4.2（Safari 14.0.3 / WebKit）。已知陷阱：
- CSS 变量在 `transform` 中会被忽略（`var(--tw-translate-x)` → 整个 transform 无效）
- `inset` 简写属性不支持（需展开为 `top/right/bottom/left`）
- flex `gap` 不支持（已通过 `.safari14` 类用 margin 回退）
- UA 检测脚本在 `base.html` 中，Safari < 14.1 添加 `safari14` 类

## 项目速查

- **本地启动**：`python3 run.py` → http://localhost:5000（Flask 开发服务器，模板自动重载）
- **生产部署**：打包 → SFTP 上传 → 服务器 `pkill -f waitress` → 解压 → 重启（详见 `doc/fitness_deploy.md`）
- **打包命令**：见 README.md 生产部署章节，排除非运行时文件
- **版本号**：`app/templates/app.html` 和 `login.html` 中各有一处
- **应用元数据**：`app/__init__.py` 顶部的 `APP_NAME` 等常量（SSOT）
