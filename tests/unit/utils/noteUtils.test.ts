import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { NoteUtils } from '../../../src/utils/noteUtils';
import { NoteData } from '../../../src/types';

// Mock Obsidian modules
jest.mock('obsidian', () => {
  class MockMarkdownView {}
  return {
    getAllTags: jest.fn(),
    MarkdownView: MockMarkdownView
  };
});

describe('NoteUtils', () => {
  let mockApp: any;
  let mockFile1: any;
  let mockFile2: any;
  let mockCache1: any;
  let mockCache2: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock files
    mockFile1 = {
      path: 'test1.md',
      basename: 'test1',
      stat: { mtime: 1000, ctime: 500, size: 100 }
    };

    mockFile2 = {
      path: 'test2.md',
      basename: 'test2',
      stat: { mtime: 2000, ctime: 1000, size: 200 }
    };

    // Mock caches
    mockCache1 = {
      frontmatter: { title: 'Test 1' },
      tags: ['#research', '#project']
    };

    mockCache2 = {
      frontmatter: { title: 'Test 2' },
      tags: ['#research']
    };

    // Mock app
    mockApp = {
      vault: {
        getMarkdownFiles: jest.fn().mockReturnValue([mockFile1, mockFile2])
      },
      metadataCache: {
        getFileCache: jest.fn()
      },
      workspace: {
        getActiveViewOfType: jest.fn(),
        getMostRecentLeaf: jest.fn(),
        getLeavesOfType: jest.fn()
      }
    };

    // Mock getAllTags
    const { getAllTags } = require('obsidian');
    getAllTags.mockImplementation((cache: any) => cache.tags);
  });

  describe('getAllNotesWithTags', () => {
    it('should return notes with tags', () => {
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(mockCache1)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getAllNotesWithTags(mockApp);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        file: mockFile1,
        tags: ['research', 'project'],
        frontmatter: { title: 'Test 1' },
        title: 'test1'
      });
      expect(result[1]).toEqual({
        file: mockFile2,
        tags: ['research'],
        frontmatter: { title: 'Test 2' },
        title: 'test2'
      });
    });

    it('should skip notes without cache', () => {
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getAllNotesWithTags(mockApp);

      expect(result).toHaveLength(1);
      expect(result[0].file).toBe(mockFile2);
    });

    it('should skip notes without tags', () => {
      const cacheWithoutTags = { frontmatter: {}, tags: [] };
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(cacheWithoutTags)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getAllNotesWithTags(mockApp);

      expect(result).toHaveLength(1);
      expect(result[0].file).toBe(mockFile2);
    });
  });

  describe('getNotesForTag', () => {
    it('should return notes for specific tag', () => {
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(mockCache1)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getNotesForTag(mockApp, 'research');

      expect(result).toHaveLength(2);
      expect(result[0].file).toBe(mockFile1);
      expect(result[1].file).toBe(mockFile2);
    });

    it('should return empty array for non-existent tag', () => {
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(mockCache1)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getNotesForTag(mockApp, 'nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAllTags', () => {
    it('should return unique sorted tags', () => {
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(mockCache1)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getAllTags(mockApp);

      expect(result).toEqual(['project', 'research']);
    });

    it('should handle duplicate tags', () => {
      const cacheWithDuplicate = { frontmatter: {}, tags: ['#research', '#project'] };
      mockApp.metadataCache.getFileCache
        .mockReturnValueOnce(cacheWithDuplicate)
        .mockReturnValueOnce(mockCache2);

      const result = NoteUtils.getAllTags(mockApp);

      expect(result).toEqual(['project', 'research']);
    });
  });

  describe('getCurrentNote', () => {
    it('should return active markdown view file', () => {
      const mockView = { file: mockFile1 };
      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

      const result = NoteUtils.getCurrentNote(mockApp);

      expect(result).toBe(mockFile1);
    });

    it('should return most recent leaf file when no active view', () => {
      const { MarkdownView } = require('obsidian');
      const mockLeaf = { view: new MarkdownView() };
      mockLeaf.view.file = mockFile2;
      mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
      mockApp.workspace.getMostRecentLeaf.mockReturnValue(mockLeaf);

      const result = NoteUtils.getCurrentNote(mockApp);

      expect(result).toBe(mockFile2);
    });

    it('should return first markdown leaf file as last resort', () => {
      // leaf.view instanceof MarkdownView
      const { MarkdownView } = require('obsidian');
      const mockLeaf = { view: new MarkdownView() };
      mockLeaf.view.file = mockFile1;
      mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
      mockApp.workspace.getMostRecentLeaf.mockReturnValue(null);
      mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

      const result = NoteUtils.getCurrentNote(mockApp);

      expect(result).toBe(mockFile1);
    });

    it('should return null when no file found', () => {
      mockApp.workspace.getActiveViewOfType.mockReturnValue(null);
      mockApp.workspace.getMostRecentLeaf.mockReturnValue(null);
      mockApp.workspace.getLeavesOfType.mockReturnValue([]);

      const result = NoteUtils.getCurrentNote(mockApp);

      expect(result).toBeNull();
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove invalid characters', () => {
      const result = NoteUtils.sanitizeFileName('test<>:"/\\|?*file');
      expect(result).toBe('test---------file');
    });

    it('should replace spaces with hyphens', () => {
      const result = NoteUtils.sanitizeFileName('test file name');
      expect(result).toBe('test-file-name');
    });

    it('should handle multiple spaces', () => {
      const result = NoteUtils.sanitizeFileName('test   file');
      expect(result).toBe('test-file');
    });

    it('should handle normal tag names', () => {
      const result = NoteUtils.sanitizeFileName('research');
      expect(result).toBe('research');
    });
  });
}); 