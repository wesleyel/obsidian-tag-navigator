# Obsidian Tag Navigator - 开发路线图

## 项目概述

Obsidian Tag Navigator 是一个为 Obsidian 笔记应用设计的插件，旨在为页面根据标签（tags）和 frontmatter 属性提供智能的下一页（next）和上一页（prev）导航功能。该插件通过分析笔记的元数据，为用户创建基于语义和分类的浏览体验。

## 核心功能

### 🎯 主要特性

- **基于标签的导航**: 根据笔记的标签创建逻辑导航序列
- **Frontmatter 属性支持**: 利用 YAML frontmatter 中的自定义属性进行导航
- **智能排序**: 支持多种排序方式（时间、标题、自定义顺序等）
- **跨文件夹导航**: 不受文件夹结构限制的语义导航

### 🔧 技术实现

- 基于 Obsidian API 开发
- TypeScript 实现，提供类型安全
- 响应式设计，支持桌面和移动端

## 功能规划

### 基础导航功能

- Navigator: Open manual navigation panel
  - 打开手动排序页面，根据标签，列出全部笔记
  - 可以手动排序，也可点击标签旁边的按钮，按时间或标题排序
  - 排序结果以json格式保存，每次打开页面时，自动加载上次排序结果

- Navigator: Next/Prev Panel
  - 侧边面板，显示标签，并为每个标签增加Prev/Next按钮
