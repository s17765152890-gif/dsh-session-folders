# dsh-session-folders 会话文件夹

DeepSeek Harness 插件：让每个会话的工作目录清晰可见、可一键打开，并给工作区文件夹标色、分组筛选。

DeepSeek Harness plugin: per-session working directory display with one-click open in the file manager, plus workspace folder colors, aliases and color filtering.

## 功能 Features

- **工作目录可见 / Working directory display**：侧边栏悬停卡片、会话 `...` 菜单里显示完整工作目录（含盘符），点击在文件管理器中打开（Explorer / Finder / 文件）。
- **文件夹标色 / Folder colors**：在会话 `...` 菜单里给所属工作区文件夹点一个颜色，文件夹整行显示色条 + 淡底 + 彩色标题。
- **颜色别名与扩展 / Aliases & palette**：设置页可改名（如黄色=紧急项目）、改色值、新增、删除、恢复默认。
- **按颜色筛选 / Filter by color**：侧边栏底部调色盘按钮，多选过滤，只看命中颜色的文件夹及其会话。
- **选中高亮迁移 / Selection highlight**：选中行的文件夹保持自定义色，文字改用主题色加亮，避开和主题选中态的冲突。

## 安装 Install

在 DSH「插件 → 添加插件」中填入：

```
github:s17765152890-gif/dsh-session-folders#v0.1.0
```

或用本地目录安装后重启 DSH。

Requires DeepSeek Harness 0.2.x (desktop). After install, press `F5` in the Web GUI.

## 数据存储 Storage

颜色与筛选存在本机浏览器 `localStorage`（key `session-cwd-opener:v1`），跟随当前 profile，不上传。

## 开源协议 License

MIT — 详见 [LICENSE](LICENSE)。
