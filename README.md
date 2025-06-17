# Obsidian Tag Navigator

一个为 Obsidian 笔记应用设计的智能导航插件，基于标签（tags）和 frontmatter 属性提供智能的下一页（next）和上一页（prev）导航功能。

## ✨ 主要功能

### 🎯 核心导航
- **基于标签的智能导航**: 根据笔记的标签创建逻辑导航序列
- **多种排序方式**: 支持按标题、修改时间、创建时间或自定义顺序排序
- **跨文件夹导航**: 不受文件夹结构限制的语义导航
- **实时位置显示**: 显示当前笔记在标签序列中的位置信息

### 🔧 用户界面
- **侧边导航面板**: 显示当前笔记的标签，为每个标签提供 Prev/Next 按钮
- **手动导航模态框**: 可视化排序界面，支持拖拽排序
- **设置页面**: 双栏布局，左侧显示标签列表，右侧支持自定义排序
- **响应式设计**: 支持桌面和移动端

### 📁 文件管理
- **JSON 格式存储**: 自定义排序以 JSON 格式保存，便于管理
- **标签导出功能**: 将标签导航信息导出为 Markdown 文件
- **自动文件夹创建**: 自动创建导出文件夹

## 🚀 快速开始

### 安装
1. 在 Obsidian 中打开设置 → 第三方插件
2. 关闭安全模式
3. 点击浏览社区插件
4. 搜索 "Tag Navigator" 并安装

### 基本使用
1. **打开侧边导航面板**: 使用命令 `Navigator: Toggle Next/Prev Panel`
2. **手动排序**: 使用命令 `Navigator: Open manual navigation panel`
3. **设置管理**: 使用命令 `Navigator: Open settings page` 或点击工具栏图标

## 📋 命令列表

| 命令 | 功能 |
|------|------|
| `Navigator: Toggle Next/Prev Panel` | 切换侧边导航面板 |
| `Navigator: Open manual navigation panel` | 打开手动导航排序界面 |
| `Navigator: Open settings page` | 打开设置页面 |
| `Navigator: Export all tags to notes` | 导出所有标签为笔记文件 |
| `Navigator: Go to next note` | 导航到下一个笔记 |
| `Navigator: Go to previous note` | 导航到上一个笔记 |

## ⚙️ 设置选项

### 基本设置
- **默认排序方式**: 选择标题、修改时间、创建时间或自定义排序
- **Toast 消息**: 开启/关闭操作提示消息
- **导出文件夹路径**: 设置标签导出文件的保存位置

### 自定义排序
- 在设置页面中，左侧显示所有标签
- 右侧支持拖拽排序自定义顺序
- 提供按修改时间和名称排序的快捷按钮
- 排序结果自动保存为 JSON 格式

## 🏗️ 项目架构

```
obsidian-tag-navigator/
├── main.ts                          # 主插件文件
├── src/
│   ├── types/
│   │   └── index.ts                # 类型定义
│   ├── views/
│   │   ├── NavigatorPanelView.ts   # 侧边面板视图
│   │   ├── ManualNavigationModal.ts # 手动导航模态框
│   │   └── SettingsPageView.ts     # 设置页面视图
│   └── utils/                      # 工具函数
├── styles.css                      # 样式文件
├── manifest.json                   # 插件清单
└── README.md                       # 使用文档
```

## 🔧 技术实现

### 核心组件
- **TagNavigatorPlugin**: 插件主入口，命令注册和视图管理
- **NavigatorPanelView**: 侧边面板界面，实时显示当前笔记标签
- **ManualNavigationModal**: 手动排序界面，支持拖拽排序
- **SettingsPageView**: 双栏设置页面，标签管理和排序配置

### 数据存储
- **JSON 格式**: 自定义排序以 JSON 格式存储在插件数据中
- **标签导出**: 支持将导航信息导出为 Markdown 文件
- **自动同步**: 设置变更自动保存和同步

### 排序算法
- **标题排序**: 按笔记标题字母顺序
- **时间排序**: 按修改时间或创建时间
- **自定义排序**: 用户手动拖拽排序
- **智能缓存**: 排序结果缓存以提高性能

## 📝 使用示例

### 侧边导航面板
```
当前笔记: Research Notes
标签: #research, #methodology

#research [2/5] [Prev] [Next]
#methodology [1/3] [Prev] [Next]
```

### 手动排序界面
- 显示所有带有指定标签的笔记
- 支持拖拽重新排序
- 提供快速排序按钮
- 实时预览排序结果

### 设置页面
- 左侧：标签列表，显示所有可用标签
- 右侧：排序配置，支持拖拽和快捷排序
- 自动保存：配置变更立即生效

## 🎨 界面特性

- **现代化设计**: 简洁美观的用户界面
- **拖拽排序**: 直观的拖拽操作
- **实时反馈**: 操作结果即时显示
- **响应式布局**: 适配不同屏幕尺寸
- **主题兼容**: 支持 Obsidian 主题系统

## 🔄 更新日志

### v1.0.0
- ✅ 基础导航功能
- ✅ 侧边导航面板
- ✅ 手动排序界面
- ✅ 设置页面
- ✅ 标签导出功能
- ✅ 拖拽排序支持
- ✅ JSON 格式存储
- ✅ 响应式设计

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Obsidian 官网](https://obsidian.md/)
- [插件开发文档](https://github.com/obsidianmd/obsidian-api)