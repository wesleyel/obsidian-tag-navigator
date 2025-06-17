# Obsidian Tag Navigator

基于标签的智能导航插件，为 Obsidian 笔记提供便捷的上一页/下一页导航功能。

## 功能特性

### 🎯 核心功能

- **基于标签的导航**: 根据笔记的标签创建逻辑导航序列
- **智能排序**: 支持多种排序方式（标题、修改时间、创建时间、自定义顺序）
- **手动导航面板**: 可视化管理和排序标签下的笔记
- **侧边导航面板**: 快速在不同标签间进行导航
- **自定义排序**: 支持拖拽排序并保存自定义顺序

### 🚀 主要功能

#### 1. 手动导航面板
- 通过命令面板搜索 "Navigator: Open manual navigation panel" 或点击左侧工具栏图标
- 选择标签查看该标签下的所有笔记
- 支持多种排序方式：标题、修改时间、创建时间、自定义排序
- 自定义排序模式下可以拖拽笔记进行排序
- 点击笔记名称直接跳转到对应笔记

#### 2. 侧边导航面板
- 通过命令 "Navigator: Toggle Next/Prev Panel" 打开侧边面板
- 显示所有标签及每个标签下的笔记数量
- 为每个标签提供 Prev/Next 按钮进行快速导航

#### 3. 快捷导航命令
- `Navigator: Go to next note` - 跳转到当前笔记相同标签下的下一个笔记
- `Navigator: Go to previous note` - 跳转到当前笔记相同标签下的上一个笔记

## 安装方法

### 手动安装

1. 下载最新的 release 文件
2. 解压到你的 Obsidian vault 的 `.obsidian/plugins/obsidian-tag-navigator/` 目录
3. 在 Obsidian 设置中启用 "Tag Navigator" 插件

### 开发安装

1. 克隆此仓库到你的 `.obsidian/plugins/` 目录
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建插件
4. 在 Obsidian 设置中启用插件

## 使用指南

### 基本使用

1. **确保你的笔记有标签**: 插件只对带有标签的笔记有效
2. **打开手动导航面板**: 使用命令或点击工具栏图标
3. **选择标签**: 从下拉菜单中选择要导航的标签
4. **排序笔记**: 选择合适的排序方式
5. **开始导航**: 点击笔记名称跳转，或使用 Prev/Next 按钮

### 自定义排序

1. 在手动导航面板中选择 "Custom Order" 排序方式
2. 拖拽笔记到desired位置
3. 点击 "Save Custom Order" 保存排序
4. 自定义排序会在设置中保存，下次打开时自动加载

### 快捷键建议

建议为以下命令设置快捷键：
- `Navigator: Go to next note` → `Ctrl+]` 或 `Cmd+]`
- `Navigator: Go to previous note` → `Ctrl+[` 或 `Cmd+[`
- `Navigator: Toggle Next/Prev Panel` → `Ctrl+Shift+N` 或 `Cmd+Shift+N`

## 设置选项

在插件设置中可以配置：

- **默认排序方式**: 选择默认的笔记排序方式
- **管理自定义排序**: 查看和清除已保存的自定义排序

## 技术特性

- **TypeScript 开发**: 提供类型安全和更好的开发体验
- **响应式设计**: 支持桌面和移动端
- **性能优化**: 智能缓存和增量更新
- **兼容性**: 支持 Obsidian v0.15.0+

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 实现基于标签的导航功能
- 支持多种排序方式
- 手动导航面板和侧边面板
- 自定义排序功能
