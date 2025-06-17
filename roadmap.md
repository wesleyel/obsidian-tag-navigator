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
- 模块化架构，代码分离清晰

## 项目结构

```
obsidian-tag-navigator/
├── main.ts                          # 主插件文件
├── src/
│   ├── types/
│   │   └── index.ts                # 类型定义
│   ├── utils/
│   │   └── FileManager.ts          # 文件管理工具
│   ├── views/
│   │   ├── NavigatorPanelView.ts   # 侧边面板视图
│   │   └── ManualNavigationModal.ts # 手动导航模态框
│   └── settings/
│       └── TagNavigatorSettingTab.ts # 设置面板
├── styles.css                      # 样式文件
├── manifest.json                   # 插件清单
└── README.md                       # 使用文档
```

## 功能规划

### 基础导航功能

- [x] Navigator: Open manual navigation panel
  - ✅ 打开手动排序页面，根据标签，列出全部笔记
  - ✅ 可以手动排序，也可点击标签旁边的按钮，按时间或标题排序
  - ✅ 手动排序以md文件保存在navigator文件夹下，文件名称为tag-navigator-<tag>.md
    - ✅ 通过frontmatter中的tags属性，设置排序方式
    - ✅ 排序结果以number list格式列出，使用obsidian双链引用笔记文件
  - ✅ 支持拖拽排序功能

- [x] Navigator: Next/Prev Panel
  - ✅ 侧边面板，显示当前笔记的标签，并为每个标签增加Prev/Next按钮
  - ✅ 显示当前笔记在标签序列中的位置信息
  - ✅ 智能获取当前活动笔记

- [x] 添加开关允许关闭toast消息
  - ✅ 在设置中添加消息开关选项

### 高级功能

- [x] **文件管理系统** (`src/utils/FileManager.ts`)
  - ✅ MD文件格式保存自定义排序
  - ✅ Frontmatter 支持 (tag, sortOrder, created, updated)
  - ✅ 双链格式的笔记引用 `[[note-name]]`
  - ✅ 自动创建navigator文件夹
  - ✅ 解析和生成MD文件内容

- [x] **模块化架构**
  - ✅ 类型定义分离 (`src/types/index.ts`)
  - ✅ 视图组件分离 (`src/views/`)
  - ✅ 设置面板分离 (`src/settings/`)
  - ✅ 工具类分离 (`src/utils/`)

- [x] **用户界面增强**
  - ✅ 调试信息显示
  - ✅ 当前文件名显示
  - ✅ 位置信息显示 [current/total]
  - ✅ 拖拽排序视觉反馈
  - ✅ 响应式设计

### 设置和配置

- [x] **插件设置**
  - ✅ 默认排序方式选择
  - ✅ Toast消息开关
  - ✅ Navigator文件夹路径配置
  - ✅ 已保存自定义排序管理

- [x] **文件保存格式示例**
```markdown
---
tag: research
sortOrder: custom
created: 2024-01-15T10:30:00.000Z
updated: 2024-01-15T10:30:00.000Z
---

# Tag Navigator: #research

Sort Order: custom
Total Notes: 5

## Navigation Order

1. [[Introduction to Research]]
2. [[Research Methodology]]
3. [[Data Collection]]
4. [[Analysis Framework]]
5. [[Conclusions]]
```

## 技术实现细节

### 核心组件

1. **TagNavigatorPlugin** (`main.ts`)
   - 插件主入口
   - 命令注册和视图管理
   - 导航逻辑实现

2. **FileManager** (`src/utils/FileManager.ts`)
   - MD文件的创建、读取、更新
   - Frontmatter 解析
   - 双链格式处理

3. **NavigatorPanelView** (`src/views/NavigatorPanelView.ts`)
   - 侧边面板界面
   - 实时显示当前笔记标签
   - Prev/Next 导航按钮

4. **ManualNavigationModal** (`src/views/ManualNavigationModal.ts`)
   - 手动排序界面
   - 拖拽排序功能
   - 自定义排序保存

5. **TagNavigatorSettingTab** (`src/settings/TagNavigatorSettingTab.ts`)
   - 插件设置界面
   - 配置选项管理
   - 已保存排序文件管理

### 数据流

1. **笔记扫描** → 提取标签和元数据
2. **排序处理** → 根据设置应用排序规则
3. **文件保存** → 自定义排序保存为MD文件
4. **导航执行** → 根据排序结果进行导航

## 已完成功能

- ✅ 基于标签的智能导航
- ✅ 多种排序方式支持
- ✅ MD文件格式的自定义排序保存
- ✅ 拖拽排序界面
- ✅ 侧边面板实时更新
- ✅ 完整的设置系统
- ✅ 模块化代码架构
- ✅ 调试和错误处理
- ✅ 响应式用户界面

## 待优化项目

- [ ] 性能优化：大量笔记时的处理
- [ ] 国际化支持
- [ ] 更多排序选项 (创建日期、文件大小等)
- [ ] 批量操作功能
- [ ] 导入/导出自定义排序
- [ ] 快捷键自定义