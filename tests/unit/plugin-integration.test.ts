import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock basic Obsidian types
interface MockTFile {
  path: string;
  basename: string;
  stat: { mtime: number; ctime: number; size: number; };
}

interface MockCache {
  tags?: Array<{ tag: string }>;
  frontmatter?: Record<string, any>;
}

interface MockApp {
  vault: {
    getMarkdownFiles: () => MockTFile[];
  };
  metadataCache: {
    getFileCache: (file: MockTFile) => MockCache | null;
  };
  workspace: {
    getActiveViewOfType: (type: any) => any;
  };
}

describe('Plugin Integration Tests', () => {
  let mockApp: MockApp;
  let mockFiles: MockTFile[];
  let mockCaches: Record<string, MockCache>;

  beforeEach(() => {
    // Setup mock files
    mockFiles = [
      { path: 'note1.md', basename: 'note1', stat: { mtime: 1000, ctime: 500, size: 100 } },
      { path: 'note2.md', basename: 'note2', stat: { mtime: 2000, ctime: 1000, size: 200 } },
      { path: 'note3.md', basename: 'note3', stat: { mtime: 1500, ctime: 1500, size: 150 } }
    ];

    // Setup mock file caches
    mockCaches = {
      'note1.md': {
        tags: [{ tag: '#important' }, { tag: '#project' }],
        frontmatter: { title: 'Note 1' }
      },
      'note2.md': {
        tags: [{ tag: '#research' }, { tag: '#important' }],
        frontmatter: { title: 'Note 2' }
      },
      'note3.md': {
        tags: [{ tag: '#research' }],
        frontmatter: { title: 'Note 3' }
      }
    };

    // Setup mock app
    mockApp = {
      vault: {
        getMarkdownFiles: () => mockFiles
      },
      metadataCache: {
        getFileCache: (file: MockTFile) => mockCaches[file.path] || null
      },
      workspace: {
        getActiveViewOfType: () => null
      }
    };
  });

  describe('File Processing', () => {
    it('should process markdown files', () => {
      const files = mockApp.vault.getMarkdownFiles();
      expect(files).toHaveLength(3);
      expect(files[0].basename).toBe('note1');
    });

    it('should get file metadata', () => {
      const file = mockFiles[0];
      const cache = mockApp.metadataCache.getFileCache(file);
      
      expect(cache).toBeTruthy();
      expect(cache?.tags).toHaveLength(2);
      expect(cache?.tags?.[0].tag).toBe('#important');
    });

    it('should extract tags from files', () => {
      const allTags = new Set<string>();
      
      for (const file of mockFiles) {
        const cache = mockApp.metadataCache.getFileCache(file);
        if (cache?.tags) {
          for (const tag of cache.tags) {
            const cleanTag = tag.tag.replace('#', '');
            allTags.add(cleanTag);
          }
        }
      }
      
      const tagsArray = Array.from(allTags).sort();
      expect(tagsArray).toEqual(['important', 'project', 'research']);
    });

    it('should filter files by tag', () => {
      const targetTag = 'research';
      const filteredFiles = [];
      
      for (const file of mockFiles) {
        const cache = mockApp.metadataCache.getFileCache(file);
        if (cache?.tags) {
          const fileTags = cache.tags.map(t => t.tag.replace('#', ''));
          if (fileTags.includes(targetTag)) {
            filteredFiles.push({
              file,
              tags: fileTags,
              title: file.basename,
              frontmatter: cache.frontmatter || {}
            });
          }
        }
      }
      
      expect(filteredFiles).toHaveLength(2);
      expect(filteredFiles.every(f => f.tags.includes('research'))).toBe(true);
    });
  });

  describe('Sorting Functions', () => {
    interface NoteData {
      file: MockTFile;
      tags: string[];
      title: string;
      frontmatter: Record<string, any>;
    }

    let testNotes: NoteData[];

    beforeEach(() => {
      testNotes = [
        {
          file: { path: 'c.md', basename: 'C Note', stat: { mtime: 1000, ctime: 500, size: 100 } },
          tags: ['test'],
          title: 'C Note',
          frontmatter: {}
        },
        {
          file: { path: 'a.md', basename: 'A Note', stat: { mtime: 3000, ctime: 2000, size: 300 } },
          tags: ['test'],
          title: 'A Note',
          frontmatter: {}
        },
        {
          file: { path: 'b.md', basename: 'B Note', stat: { mtime: 2000, ctime: 1000, size: 200 } },
          tags: ['test'],
          title: 'B Note',
          frontmatter: {}
        }
      ];
    });

    it('should sort notes by title alphabetically', () => {
      const sorted = [...testNotes].sort((a, b) => a.title.localeCompare(b.title));
      
      expect(sorted[0].title).toBe('A Note');
      expect(sorted[1].title).toBe('B Note');
      expect(sorted[2].title).toBe('C Note');
    });

    it('should sort notes by modified time (newest first)', () => {
      const sorted = [...testNotes].sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
      
      expect(sorted[0].file.stat.mtime).toBe(3000);
      expect(sorted[1].file.stat.mtime).toBe(2000);
      expect(sorted[2].file.stat.mtime).toBe(1000);
    });

    it('should sort notes by created time (newest first)', () => {
      const sorted = [...testNotes].sort((a, b) => b.file.stat.ctime - a.file.stat.ctime);
      
      expect(sorted[0].file.stat.ctime).toBe(2000);
      expect(sorted[1].file.stat.ctime).toBe(1000);
      expect(sorted[2].file.stat.ctime).toBe(500);
    });

    it('should sort notes by custom order', () => {
      const customOrder = ['b.md', 'c.md', 'a.md'];
      const sorted = [...testNotes].sort((a, b) => {
        const indexA = customOrder.indexOf(a.file.path);
        const indexB = customOrder.indexOf(b.file.path);
        
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
      
      expect(sorted[0].file.path).toBe('b.md');
      expect(sorted[1].file.path).toBe('c.md');
      expect(sorted[2].file.path).toBe('a.md');
    });
  });

  describe('Navigation Logic', () => {
    it('should calculate next index with wrap-around', () => {
      const length = 3;
      
      // Test normal increment
      expect((0 + 1) % length).toBe(1);
      expect((1 + 1) % length).toBe(2);
      
      // Test wrap-around
      expect((2 + 1) % length).toBe(0);
    });

    it('should calculate previous index with wrap-around', () => {
      const length = 3;
      
      // Test normal decrement with variable indices
      let currentIndex = 2;
      expect(currentIndex === 0 ? length - 1 : currentIndex - 1).toBe(1);
      
      currentIndex = 1;
      expect(currentIndex === 0 ? length - 1 : currentIndex - 1).toBe(0);
      
      // Test wrap-around
      currentIndex = 0;
      expect(currentIndex === 0 ? length - 1 : currentIndex - 1).toBe(2);
    });
  });

  describe('Utility Functions', () => {
    it('should sanitize file names', () => {
      const sanitizeFileName = (filename: string) => {
        return filename.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
      };
      
      expect(sanitizeFileName('Test File.md')).toBe('Test-File.md');
      expect(sanitizeFileName('Test<>:"File|Name?.md')).toBe('Test----File-Name-.md');
      expect(sanitizeFileName('Normal_File-Name.md')).toBe('Normal_File-Name.md');
    });

    it('should generate sort order descriptions', () => {
      const getSortOrderDescription = (sortOrder: string, hasCustomOrder: boolean) => {
        if (sortOrder === 'custom' && hasCustomOrder) {
          return 'Custom Order';
        }
        
        switch (sortOrder) {
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
      
      expect(getSortOrderDescription('title', false)).toBe('Alphabetical (Title)');
      expect(getSortOrderDescription('modified', false)).toBe('Last Modified');
      expect(getSortOrderDescription('created', false)).toBe('Created Date');
      expect(getSortOrderDescription('custom', true)).toBe('Custom Order');
      expect(getSortOrderDescription('custom', false)).toBe('Default Order');
    });

    it('should clean tags from metadata', () => {
      const cleanTags = (tags: Array<{ tag: string }>) => {
        return tags.map(t => t.tag.replace('#', '')).filter(Boolean);
      };
      
      const mockTags = [
        { tag: '#important' },
        { tag: '#project' },
        { tag: '#research' }
      ];
      
      const cleaned = cleanTags(mockTags);
      expect(cleaned).toEqual(['important', 'project', 'research']);
    });
  });
}); 