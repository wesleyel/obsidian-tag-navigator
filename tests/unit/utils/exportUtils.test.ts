import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ExportUtils } from '../../../src/utils/exportUtils';
import { NoteData } from '../../../src/types';

// Mock Obsidian modules
jest.mock('obsidian', () => ({
  TFile: class MockTFile {}
}));

describe('ExportUtils', () => {
  let mockApp: any;
  let mockNotes: NoteData[];
  let mockCustomOrder: Record<string, string[]>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock notes
    mockNotes = [
      {
        file: { path: 'note1.md', basename: 'note1', name: 'note1', extension: 'md', vault: {}, parent: null, stat: { mtime: 1000, ctime: 500, size: 100 } } as any,
        tags: ['research'],
        frontmatter: {},
        title: 'Note A'
      },
      {
        file: { path: 'note2.md', basename: 'note2', name: 'note2', extension: 'md', vault: {}, parent: null, stat: { mtime: 2000, ctime: 1000, size: 200 } } as any,
        tags: ['research'],
        frontmatter: {},
        title: 'Note B'
      },
      {
        file: { path: 'note3.md', basename: 'note3', name: 'note3', extension: 'md', vault: {}, parent: null, stat: { mtime: 1500, ctime: 750, size: 150 } } as any,
        tags: ['research'],
        frontmatter: {},
        title: 'Note C'
      }
    ];

    mockCustomOrder = {
      research: ['note2.md', 'note1.md', 'note3.md']
    };

    // Mock app
    mockApp = {
      vault: {
        getAbstractFileByPath: jest.fn(),
        createFolder: jest.fn().mockImplementation(() => Promise.resolve()),
        create: jest.fn().mockImplementation(() => Promise.resolve()),
        modify: jest.fn().mockImplementation(() => Promise.resolve())
      }
    };
  });

  describe('ensureExportFolderExists', () => {
    it('should create folder when it does not exist', async () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      await ExportUtils.ensureExportFolderExists(mockApp, 'exports');

      expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith('exports');
      expect(mockApp.vault.createFolder).toHaveBeenCalledWith('exports');
    });

    it('should not create folder when it already exists', async () => {
      const existingFolder = { name: 'exports' };
      mockApp.vault.getAbstractFileByPath.mockReturnValue(existingFolder);

      await ExportUtils.ensureExportFolderExists(mockApp, 'exports');

      expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith('exports');
      expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
    });
  });

  describe('generateFileName', () => {
    it('should replace {tag} placeholder with sanitized tag name', () => {
      const result = ExportUtils.generateFileName('tag-{tag}.md', 'research');

      expect(result).toBe('tag-research.md');
    });

    it('should handle multiple {tag} placeholders', () => {
      const result = ExportUtils.generateFileName('{tag}-list-{tag}.md', 'research');

      expect(result).toBe('research-list-research.md');
    });

    it('should handle format without placeholders', () => {
      const result = ExportUtils.generateFileName('export.md', 'research');

      expect(result).toBe('export.md');
    });

    it('should sanitize tag names with special characters', () => {
      const result = ExportUtils.generateFileName('tag-{tag}.md', 'research notes');

      expect(result).toBe('tag-research-notes.md');
    });
  });

  describe('exportTagToNote', () => {
    it('should return false for empty notes array', async () => {
      const result = await ExportUtils.exportTagToNote(
        mockApp, 'research', [], 'exports', 'tag-{tag}.md', 'title', {}
      );

      expect(result).toBe(false);
    });

    it('should create new file when it does not exist', async () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      const result = await ExportUtils.exportTagToNote(
        mockApp, 'research', mockNotes, 'exports', 'tag-{tag}.md', 'title', {}
      );

      expect(result).toBe(true);
      expect(mockApp.vault.create).toHaveBeenCalledWith('exports/tag-research.md', expect.any(String));
    });

    it('should update existing file when it exists', async () => {
      const { TFile } = require('obsidian');
      const existingFile = new TFile('exports/tag-research.md', 'tag-research');
      mockApp.vault.getAbstractFileByPath.mockReturnValue(existingFile);
      mockApp.vault.modify.mockResolvedValue(undefined);

      const result = await ExportUtils.exportTagToNote(
        mockApp, 'research', mockNotes, 'exports', 'tag-{tag}.md', 'title', {}
      );

      expect(result).toBe(true);
      expect(mockApp.vault.modify).toHaveBeenCalledWith(existingFile, expect.any(String));
    });

    it('should use custom order when available', async () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      await ExportUtils.exportTagToNote(
        mockApp, 'research', mockNotes, 'exports', 'tag-{tag}.md', 'title', mockCustomOrder
      );

      const createCall = mockApp.vault.create.mock.calls[0];
      const content = createCall[1];
      
      // Check that content reflects custom order (note2, note1, note3)
      expect(content).toContain('1. [[Note B]]');
      expect(content).toContain('2. [[Note A]]');
      expect(content).toContain('3. [[Note C]]');
    });

    it('should exclude the export file itself from the notes list', async () => {
      // Add the export file itself to the notes list to test filtering
      const exportFileNote: NoteData = {
        file: { path: 'exports/tag-research.md', basename: 'tag-research', name: 'tag-research', extension: 'md', vault: {}, parent: null, stat: { mtime: 3000, ctime: 1500, size: 300 } } as any,
        tags: ['research'],
        frontmatter: {},
        title: 'tag-research'
      };
      
      const notesWithExportFile = [...mockNotes, exportFileNote];
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

      await ExportUtils.exportTagToNote(
        mockApp, 'research', notesWithExportFile, 'exports', 'tag-{tag}.md', 'title', {}
      );

      const createCall = mockApp.vault.create.mock.calls[0];
      const content = createCall[1];
      
      // Should not contain the export file itself
      expect(content).not.toContain('[[tag-research]]');
      // Should still contain other notes
      expect(content).toContain('[[Note A]]');
      expect(content).toContain('[[Note B]]');
      expect(content).toContain('[[Note C]]');
      // Total count should be 3, not 4
      expect(content).toContain('Total Notes: 3');
    });

    it('should return false when only export file itself is in notes list', async () => {
      const exportFileNote: NoteData = {
        file: { path: 'exports/tag-research.md', basename: 'tag-research', name: 'tag-research', extension: 'md', vault: {}, parent: null, stat: { mtime: 3000, ctime: 1500, size: 300 } } as any,
        tags: ['research'],
        frontmatter: {},
        title: 'tag-research'
      };

      const result = await ExportUtils.exportTagToNote(
        mockApp, 'research', [exportFileNote], 'exports', 'tag-{tag}.md', 'title', {}
      );

      expect(result).toBe(false);
      expect(mockApp.vault.create).not.toHaveBeenCalled();
      expect(mockApp.vault.modify).not.toHaveBeenCalled();
    });
  });

  describe('generateTagNoteContent', () => {
    it('should generate correct markdown content', () => {
      const result = ExportUtils.generateTagNoteContent('research', mockNotes, 'title', {});

      expect(result).toContain('# Tag: #research');
      expect(result).toContain('## Notes List');
      expect(result).toContain('1. [[Note A]]');
      expect(result).toContain('2. [[Note B]]');
      expect(result).toContain('3. [[Note C]]');
      expect(result).toContain('-----');
      expect(result).toContain('> *This note was automatically generated by Tag Navigator plugin*');
      expect(result).toContain('Total Notes: 3');
    });

    it('should include sort order description', () => {
      const result = ExportUtils.generateTagNoteContent('research', mockNotes, 'modified', {});

      expect(result).toContain('Sort Order: Last Modified');
    });

    it('should include custom order description', () => {
      const result = ExportUtils.generateTagNoteContent('research', mockNotes, 'title', mockCustomOrder);

      expect(result).toContain('Sort Order: Custom Order');
    });

    it('should include current date and time', () => {
      const result = ExportUtils.generateTagNoteContent('research', mockNotes, 'title', {});

      const currentDate = new Date().toISOString().split('T')[0];
      expect(result).toContain(`Generated on: ${currentDate}`);
    });

    it('should handle empty notes array', () => {
      const result = ExportUtils.generateTagNoteContent('research', [], 'title', {});

      expect(result).toContain('# Tag: #research');
      expect(result).toContain('## Notes List');
      expect(result).toContain('Total Notes: 0');
      expect(result).not.toContain('1. [[');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove invalid characters', () => {
      const result = ExportUtils.sanitizeFileName('test<>:"/\\|?*file');

      expect(result).toBe('test-file');
    });

    it('should replace spaces with hyphens', () => {
      const result = ExportUtils.sanitizeFileName('test file name');

      expect(result).toBe('test-file-name');
    });

    it('should collapse multiple hyphens', () => {
      const result = ExportUtils.sanitizeFileName('test--file---name');

      expect(result).toBe('test-file-name');
    });

    it('should remove leading and trailing hyphens', () => {
      const result = ExportUtils.sanitizeFileName('-test-file-');

      expect(result).toBe('test-file');
    });

    it('should handle normal tag names', () => {
      const result = ExportUtils.sanitizeFileName('research');

      expect(result).toBe('research');
    });

    it('should handle mixed special characters', () => {
      const result = ExportUtils.sanitizeFileName('test<> file name:"/\\|?*');

      expect(result).toBe('test-file-name');
    });
  });
}); 