# 流时 (TaskFlow) - Mac 菜单栏时间表应用

基于 Electron 构建的轻量级 Mac 菜单栏时间管理工具，帮助你按预设时间表执行每日计划，在状态栏实时追踪当前任务的时间流逝情况。

***

## ✨ 核心功能

### 状态栏实时追踪

- 在菜单栏图标旁显示当前任务名称与倒计时（如 `吃早饭 - 2:34 / 5:00`）
- 任务名超过 10 字自动滚动显示
- 点击图标弹出菜单：**下一个任务** | **主面板** | **退出**

### 多时间表管理

- 支持创建、编辑、删除最多 10 个独立时间表
- 左侧卡片列表 + 右侧编辑面板的分栏布局
- 运行中的时间表显示绿色状态指示点

### 文本化编辑

- 极简文本格式快速录入：`HH:MM-HH:MM 任务内容`，每行一条
- 保存时自动校验：
  - 时间格式正确性
  - 小时 / 分钟范围有效性（0-23 / 0-59）
  - 结束时间必须晚于开始时间
  - 任务时间段不得重叠
- 校验失败时直接展示**出错行的原始文本**，便于定位问题

### 内置提示音

- 自定义「开始提示音」和「结束提示音」
- 内置多种音效：success / chime / magic / electronic 等
- 下拉选择即自动试听预览

### 语音朗读

- 任务开始时自动朗读时间与任务名（基于 Web Speech API）
- 可选择语音、调节语速（0.5× \~ 2.0×）
- 先播放「开始提示音」，延迟约 150ms 后朗读，避免声音重叠
- 提供「试听」按钮即时验证效果

### 视觉设计

- 自定义下拉菜单组件，与整体风格统一
- 支持 Retina 屏幕的状态栏图标渲染（DPR=2）

***

## 📦 安装与运行

### 环境要求

- **操作系统**：macOS 10.13+（Intel / Apple Silicon 均可）
- **Node.js**：>= 16
- **npm**：>= 8

### 开发模式

```bash
# 安装依赖
npm install

# 启动应用（开发模式）
npm start
```

### 打包安装包（DMG）

```bash
# 生成 macOS DMG 安装包到 dist/ 目录
npm run dist
```

打包产物输出目录：`dist/`

***

## 📋 使用指南

### 时间表格式

```
7:30-7:35 起床拿水壶出去，绑头发
7:35-7:40 刷牙、烧水、洗脸、接水烧水
7:45-7:50 吃早饭
9:00-11:30 深度工作
```

### 基本操作流程

1. 点击左侧 **+** 按钮新建时间表
2. 在右侧文本框按格式输入任务时间安排
3. 设置提示音、语音朗读开关与语速
4. 点击 **保存** 校验并存储
5. 点击 **开始运行** 启动计时，状态栏即开始显示进度
6. 运行中如果编辑了时间表内容要 **保存**，需先点击 **停止运行**

### 删除时间表

1. 点击左侧 **-** 按钮进入删除模式（按钮变为黄色返回图标）
2. 点击目标时间表卡片即可删除
3. 再次点击顶部返回图标退出删除模式

***

## 🗂 项目结构

```
task-flow/
├── main.js                  # Electron 主进程：IPC、数据存储、状态栏调度、时间解析、中文转语音
├── preload.js               # 主窗口的 preload 桥接层
├── tray-preload.js          # 托盘渲染窗口的 preload 桥接层
├── renderer.js              # 主窗口渲染逻辑：时间表列表、编辑表单、运行切换、自定义下拉
├── tray-renderer.js         # 托盘隐藏渲染窗口：状态栏图像绘制、音效播放、语音合成队列
├── index.html               # 主窗口结构
├── tray-renderer.html       # 托盘渲染窗口（离屏 Canvas + Audio + Speech）
├── styles.css               # Claymorphism 风格样式表
├── assets/
│   └── icon.png             # 应用与托盘图标
├── package.json             # 依赖与 electron-builder 打包配置
└── design-system.md         # 设计规范文档
```

### 进程分工

| 进程/窗口        | 职责                                               | 关键文件                                                                                                                                                                          |
| ------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主进程          | 数据持久化、IPC 路由、计时器调度、格式校验、中文时间文本生成                 | [main.js](file:///Users/weihuixin/Desktop/apps/task-flow/main.js)                                                                                                             |
| 主窗口（渲染进程）    | 时间表 CRUD、表单校验、设置面板、自定义 UI 组件                     | [renderer.js](file:///Users/weihuixin/Desktop/apps/task-flow/renderer.js) / [index.html](file:///Users/weihuixin/Desktop/apps/task-flow/index.html)                           |
| 托盘隐藏窗口（渲染进程） | Canvas 绘制状态栏图像、Audio 播放提示音、Web Speech API 语音合成队列 | [tray-renderer.js](file:///Users/weihuixin/Desktop/apps/task-flow/tray-renderer.js) / [tray-renderer.html](file:///Users/weihuixin/Desktop/apps/task-flow/tray-renderer.html) |

***

## 💾 数据存储

- **数据文件**：`schedules.json`
- **存储目录**：`~/Library/Application Support/task-flow/`
  - 通过 `app.setName('task-flow')` 强制锁定目录名，避免 `package.json` 中 `name` 与 `productName`（TaskFlow）不一致导致路径分裂
- **文件内容结构**：
  ```json
  {
    "schedules": [
      {
        "id": "...",
        "name": "工作日",
        "content": "7:30-7:35 起床\n...",
        "items": [{"start":"7:30","end":"7:35","startMin":450,"endMin":455,"title":"起床","durationMin":5}],
        "soundStart": "success",
        "soundEnd": "chime",
        "speakEnabled": true,
        "speakVoice": "Tingting",
        "speakRate": 1.0,
        "speakVolume": 1.0
      }
    ],
    "activeId": null,
    "runningId": null
  }
  ```

> **注意**：macOS 卸载 App（拖入废纸篓）不会自动删除 `Application Support` 中的数据，需手动清理。

***

## 🔧 打包与升级

### 打包配置（electron-builder）

- **App ID**：`com.taskflow.app`
- **应用名**：`TaskFlow`（Dock / 应用程序目录中显示）
- **图标**：`assets/icon.png`
- **菜单栏模式**：`LSUIElement = true`（仅状态栏，无 Dock 图标）
- **输出格式**：DMG

### 升级安装注意事项

- **必须先退出**旧版菜单栏常驻进程后再进行覆盖安装：
  ```bash
  killall TaskFlow
  ```
- 开发模式（`npm start`）与打包版共享同一 `schedules.json` 数据文件（目录统一为 `task-flow`）

***

## 🛠 技术栈

| 类别    | 选型                                          | 版本      |
| ----- | ------------------------------------------- | ------- |
| 桌面框架  | Electron                                    | ^28.3.3 |
| 打包工具  | electron-builder                            | ^24.9.1 |
| 前端    | 原生 HTML/CSS/JS                              | —       |
| 状态栏图标 | 离屏 Canvas + `nativeImage.createFromDataURL` | —       |
| 音效    | Web Audio API（合成音）                          | —       |
| 语音合成  | Web Speech API (`SpeechSynthesis`)          | —       |
| 数据持久化 | 本地 JSON 文件                                  | —       |

***

## ⚠️ 常见问题

**Q: 保存时报错「格式错误」？**
检查每行是否严格遵循 `HH:MM-HH:MM 任务内容` 格式，且时间段不重叠。错误信息中会直接展示有问题的行。

**Q: 状态栏没有显示任务？**
当前时间不在任何已设定的任务时间段内，此时状态栏会显示下一个即将开始的任务预览，或「无任务」。

**Q: 提示音不响 / 没有语音？**
检查系统音量、macOS「专注模式」是否拦截；确认时间表设置中提示音不是「无」、语音朗读开关已启用。

**Q: 升级后发现两个数据目录（task-flow / TaskFlow）？**
历史版本可能未统一目录名。建议保留 `task-flow/` 下的 `schedules.json`，将内容合并后删除旧的 `TaskFlow/` 目录。

***

## 📄 许可协议

MIT License
