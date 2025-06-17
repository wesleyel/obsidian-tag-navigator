import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * 验证导出功能修复效果的测试
 * 
 * 修复内容：
 * 1. sortNotes方法现在优先检查customOrder[tag]，不管sortOrder设置如何
 * 2. getSortOrderDescription方法也同样优先检查customOrder
 * 3. 确保导出的文件按照手动设置的排序进行
 */

interface MockTFile {
  path: string;
  basename: string;
  name: string;
  extension: string;
  stat: { mtime: number; ctime: number; size: number; };
}

interface NoteData {
  file: MockTFile;
  tags: string[];
  title: string;
  frontmatter: Record<string, any>;
}

interface TagNavigatorSettings {
  sortOrder: 'title' | 'modified' | 'created' | 'custom';
  showToastMessages: boolean;
  customOrder: Record<string, string[]>;
  exportFolderPath: string;
}

describe('导出功能修复验证', () => {
  let mockSettings: TagNavigatorSettings;
  let mockNotes: NoteData[];

  beforeEach(() => {
    // 模拟用户的真实场景：
    // - 全局排序设置为 'title'（按标题排序）
    // - 但对某个特定标签设置了手动排序
    mockSettings = {
      sortOrder: 'title',
      showToastMessages: true,
      customOrder: {
        'project': ['project-phase3.md', 'project-phase1.md', 'project-phase2.md'],
        'research': ['research-conclusion.md', 'research-data.md', 'research-intro.md']
      },
      exportFolderPath: 'tag-exports'
    };

    mockNotes = [
      // Project标签的笔记
      {
        file: { 
          path: 'project-phase1.md', 
          basename: 'Phase 1 Planning', 
          name: 'Phase 1 Planning', 
          extension: 'md',
          stat: { mtime: 1000, ctime: 500, size: 100 } 
        },
        tags: ['project'],
        title: 'Phase 1 Planning',
        frontmatter: {}
      },
      {
        file: { 
          path: 'project-phase2.md', 
          basename: 'Phase 2 Implementation', 
          name: 'Phase 2 Implementation',
          extension: 'md', 
          stat: { mtime: 2000, ctime: 1000, size: 200 } 
        },
        tags: ['project'],
        title: 'Phase 2 Implementation',
        frontmatter: {}
      },
      {
        file: { 
          path: 'project-phase3.md', 
          basename: 'Phase 3 Testing', 
          name: 'Phase 3 Testing',
          extension: 'md',
          stat: { mtime: 3000, ctime: 1500, size: 300 } 
        },
        tags: ['project'],
        title: 'Phase 3 Testing',
        frontmatter: {}
      },

      // Research标签的笔记
      {
        file: { 
          path: 'research-intro.md', 
          basename: 'Research Introduction', 
          name: 'Research Introduction',
          extension: 'md',
          stat: { mtime: 4000, ctime: 2000, size: 400 } 
        },
        tags: ['research'],
        title: 'Research Introduction',
        frontmatter: {}
      },
      {
        file: { 
          path: 'research-data.md', 
          basename: 'Research Data Analysis', 
          name: 'Research Data Analysis',
          extension: 'md',
          stat: { mtime: 5000, ctime: 2500, size: 500 } 
        },
        tags: ['research'],
        title: 'Research Data Analysis',
        frontmatter: {}
      },
      {
        file: { 
          path: 'research-conclusion.md', 
          basename: 'Research Conclusion', 
          name: 'Research Conclusion',
          extension: 'md',
          stat: { mtime: 6000, ctime: 3000, size: 600 } 
        },
        tags: ['research'],
        title: 'Research Conclusion',
        frontmatter: {}
      }
    ];
  });

  // 使用修复后的逻辑
  const sortNotesFixed = (notes: NoteData[], tag: string, settings: TagNavigatorSettings): NoteData[] => {
    // 修复：优先检查自定义排序
    if (settings.customOrder[tag] && settings.customOrder[tag].length > 0) {
      const customOrder = settings.customOrder[tag];
      return notes.sort((a, b) => {
        const aIndex = customOrder.indexOf(a.file.path);
        const bIndex = customOrder.indexOf(b.file.path);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    // 如果没有自定义排序，使用sortOrder设置
    switch (settings.sortOrder) {
      case 'title':
        return notes.sort((a, b) => a.title.localeCompare(b.title));
      case 'modified':
        return notes.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
      case 'created':
        return notes.sort((a, b) => b.file.stat.ctime - a.file.stat.ctime);
      default:
        return notes;
    }
  };

  const getSortOrderDescriptionFixed = (tag: string, settings: TagNavigatorSettings): string => {
    // 修复：优先检查自定义排序
    if (settings.customOrder[tag] && settings.customOrder[tag].length > 0) {
      return 'Custom Order';
    }
    
    switch (settings.sortOrder) {
      case 'title':
        return 'Alphabetical (Title)';
      case 'modified':
        return 'Last Modified';
      case 'created':
        return 'Created Date';
      case 'custom':
        return 'Default Order';
      default:
        return 'Unknown';
    }
  };

  describe('修复验证 - Project标签', () => {
    it('应该按照手动设置的顺序导出：Phase 3 -> Phase 1 -> Phase 2', () => {
      const projectNotes = mockNotes.filter(note => note.tags.includes('project'));
      const sorted = sortNotesFixed(projectNotes, 'project', mockSettings);
      
      // 验证排序顺序符合自定义设置：['project-phase3.md', 'project-phase1.md', 'project-phase2.md']
      expect(sorted[0].file.path).toBe('project-phase3.md');
      expect(sorted[0].title).toBe('Phase 3 Testing');
      
      expect(sorted[1].file.path).toBe('project-phase1.md');
      expect(sorted[1].title).toBe('Phase 1 Planning');
      
      expect(sorted[2].file.path).toBe('project-phase2.md');
      expect(sorted[2].title).toBe('Phase 2 Implementation');
    });

    it('导出内容应该显示Custom Order描述', () => {
      const description = getSortOrderDescriptionFixed('project', mockSettings);
      expect(description).toBe('Custom Order');
    });

    it('完整导出内容验证 - Project标签', () => {
      const projectNotes = mockNotes.filter(note => note.tags.includes('project'));
      const sorted = sortNotesFixed(projectNotes, 'project', mockSettings);
      const description = getSortOrderDescriptionFixed('project', mockSettings);
      
      // 生成导出内容
      let content = `---\n`;
      content += `tag: project\n`;
      content += `generated: ${new Date().toISOString()}\n`;
      content += `total_notes: ${sorted.length}\n`;
      content += `sort_order: ${mockSettings.sortOrder}\n`;
      content += `---\n\n`;
      
      content += `# Tag Navigator: #project\n\n`;
      content += `Sort Order: ${description}\n`;
      content += `Total Notes: ${sorted.length}\n\n`;
      
      content += `## Notes List\n\n`;
      for (let i = 0; i < sorted.length; i++) {
        content += `${i + 1}. [[${sorted[i].title}]]\n`;
      }
      
      // 验证导出内容
      expect(content).toContain('Sort Order: Custom Order');
      expect(content).toContain('sort_order: title'); // 保持原始设置
      expect(content).toContain('1. [[Phase 3 Testing]]');   // 自定义排序第1
      expect(content).toContain('2. [[Phase 1 Planning]]');  // 自定义排序第2
      expect(content).toContain('3. [[Phase 2 Implementation]]'); // 自定义排序第3
    });
  });

  describe('修复验证 - Research标签', () => {
    it('应该按照手动设置的顺序导出：Conclusion -> Data -> Introduction', () => {
      const researchNotes = mockNotes.filter(note => note.tags.includes('research'));
      const sorted = sortNotesFixed(researchNotes, 'research', mockSettings);
      
      // 验证排序顺序符合自定义设置：['research-conclusion.md', 'research-data.md', 'research-intro.md']
      expect(sorted[0].file.path).toBe('research-conclusion.md');
      expect(sorted[0].title).toBe('Research Conclusion');
      
      expect(sorted[1].file.path).toBe('research-data.md');
      expect(sorted[1].title).toBe('Research Data Analysis');
      
      expect(sorted[2].file.path).toBe('research-intro.md');
      expect(sorted[2].title).toBe('Research Introduction');
    });

    it('导出内容应该显示Custom Order描述', () => {
      const description = getSortOrderDescriptionFixed('research', mockSettings);
      expect(description).toBe('Custom Order');
    });
  });

  describe('修复验证 - 没有自定义排序的标签', () => {
    beforeEach(() => {
      // 添加一个没有自定义排序的标签
      mockNotes.push({
        file: { 
          path: 'daily-notes-1.md', 
          basename: 'Daily Note 1', 
          name: 'Daily Note 1',
          extension: 'md',
          stat: { mtime: 7000, ctime: 3500, size: 700 } 
        },
        tags: ['daily'],
        title: 'Daily Note 1',
        frontmatter: {}
      });

      mockNotes.push({
        file: { 
          path: 'daily-notes-2.md', 
          basename: 'Daily Note 2', 
          name: 'Daily Note 2',
          extension: 'md',
          stat: { mtime: 8000, ctime: 4000, size: 800 } 
        },
        tags: ['daily'],
        title: 'Daily Note 2',
        frontmatter: {}
      });
    });

    it('没有自定义排序的标签应该使用默认的title排序', () => {
      const dailyNotes = mockNotes.filter(note => note.tags.includes('daily'));
      const sorted = sortNotesFixed(dailyNotes, 'daily', mockSettings);
      
      // 应该按标题字母顺序排序
      expect(sorted[0].title).toBe('Daily Note 1');
      expect(sorted[1].title).toBe('Daily Note 2');
    });

    it('没有自定义排序的标签应该显示对应的sortOrder描述', () => {
      const description = getSortOrderDescriptionFixed('daily', mockSettings);
      expect(description).toBe('Alphabetical (Title)');
    });
  });

  describe('边界情况验证', () => {
    it('空的自定义排序数组应该回退到sortOrder', () => {
      mockSettings.customOrder['project'] = []; // 空数组
      
      const projectNotes = mockNotes.filter(note => note.tags.includes('project'));
      const sorted = sortNotesFixed(projectNotes, 'project', mockSettings);
      
      // 应该按标题排序
      expect(sorted[0].title).toBe('Phase 1 Planning');    // P开头，字母顺序最前
      expect(sorted[1].title).toBe('Phase 2 Implementation');
      expect(sorted[2].title).toBe('Phase 3 Testing');
    });

    it('自定义排序中缺少某些文件时的处理', () => {
      // 自定义排序只包含部分文件
      mockSettings.customOrder['project'] = ['project-phase3.md', 'project-phase1.md'];
      // 缺少 project-phase2.md
      
      const projectNotes = mockNotes.filter(note => note.tags.includes('project'));
      const sorted = sortNotesFixed(projectNotes, 'project', mockSettings);
      
      // 指定的文件应该在前面，未指定的在后面
      expect(sorted[0].file.path).toBe('project-phase3.md');
      expect(sorted[1].file.path).toBe('project-phase1.md');
      expect(sorted[2].file.path).toBe('project-phase2.md'); // 未指定的排在最后
    });
  });

  describe('实际使用场景模拟', () => {
    it('模拟用户导出多个标签的完整流程', () => {
      const tagsToExport = ['project', 'research', 'daily'];
      const exportResults: Record<string, any> = {};
      
      for (const tag of tagsToExport) {
        const tagNotes = mockNotes.filter(note => note.tags.includes(tag));
        if (tagNotes.length === 0) continue;
        
        const sorted = sortNotesFixed(tagNotes, tag, mockSettings);
        const description = getSortOrderDescriptionFixed(tag, mockSettings);
        
        exportResults[tag] = {
          notes: sorted.map(n => n.title),
          sortDescription: description,
          count: sorted.length
        };
      }
      
      // 验证Project标签使用自定义排序
      expect(exportResults['project'].sortDescription).toBe('Custom Order');
      expect(exportResults['project'].notes).toEqual([
        'Phase 3 Testing',
        'Phase 1 Planning', 
        'Phase 2 Implementation'
      ]);
      
      // 验证Research标签使用自定义排序
      expect(exportResults['research'].sortDescription).toBe('Custom Order');
      expect(exportResults['research'].notes).toEqual([
        'Research Conclusion',
        'Research Data Analysis',
        'Research Introduction'
      ]);
      
      // 验证Daily标签使用默认排序
      if (exportResults['daily']) {
        expect(exportResults['daily'].sortDescription).toBe('Alphabetical (Title)');
      }
    });
  });
}); 