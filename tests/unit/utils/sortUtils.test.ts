import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SortUtils } from '../../../src/utils/sortUtils';
import { NoteData } from '../../../src/types';

describe('SortUtils', () => {
  let mockNotes: NoteData[];
  let mockCustomOrder: Record<string, string[]>;

  beforeEach(() => {
    // Reset mocks
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
  });

  describe('sortNotes', () => {
    it('should use custom order when available', async () => {
      const result = await SortUtils.sortNotes(mockNotes, 'research', 'title', mockCustomOrder);

      expect(result).toHaveLength(3);
      expect(result[0].file.path).toBe('note2.md');
      expect(result[1].file.path).toBe('note1.md');
      expect(result[2].file.path).toBe('note3.md');
    });

    it('should sort by title when no custom order', async () => {
      const result = await SortUtils.sortNotes(mockNotes, 'research', 'title', {});

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Note A');
      expect(result[1].title).toBe('Note B');
      expect(result[2].title).toBe('Note C');
    });

    it('should sort by modified time', async () => {
      const result = await SortUtils.sortNotes(mockNotes, 'research', 'modified', {});

      expect(result).toHaveLength(3);
      expect(result[0].file.stat.mtime).toBe(2000); // Most recent first
      expect(result[1].file.stat.mtime).toBe(1500);
      expect(result[2].file.stat.mtime).toBe(1000);
    });

    it('should sort by created time', async () => {
      const result = await SortUtils.sortNotes(mockNotes, 'research', 'created', {});

      expect(result).toHaveLength(3);
      expect(result[0].file.stat.ctime).toBe(1000); // Most recent first
      expect(result[1].file.stat.ctime).toBe(750);
      expect(result[2].file.stat.ctime).toBe(500);
    });

    it('should return original order for unknown sort type', async () => {
      const result = await SortUtils.sortNotes(mockNotes, 'research', 'unknown', {});

      expect(result).toEqual(mockNotes);
    });

    it('should handle custom order with missing files', async () => {
      const customOrderWithMissing = {
        research: ['note2.md', 'missing.md', 'note1.md']
      };

      const result = await SortUtils.sortNotes(mockNotes, 'research', 'title', customOrderWithMissing);

      expect(result).toHaveLength(3);
      expect(result[0].file.path).toBe('note2.md');
      expect(result[1].file.path).toBe('note1.md');
      expect(result[2].file.path).toBe('note3.md'); // note3.md not in custom order, so it goes last
    });

    it('should handle empty custom order', async () => {
      const emptyCustomOrder = { research: [] };

      const result = await SortUtils.sortNotes(mockNotes, 'research', 'title', emptyCustomOrder);

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Note A'); // Should use title sort
    });

    it('should handle case insensitive title sorting', async () => {
      const notesWithMixedCase = [
        { ...mockNotes[0], title: 'note a' },
        { ...mockNotes[1], title: 'Note B' },
        { ...mockNotes[2], title: 'NOTE C' }
      ];

      const result = await SortUtils.sortNotes(notesWithMixedCase, 'research', 'title', {});

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('note a');
      expect(result[1].title).toBe('Note B');
      expect(result[2].title).toBe('NOTE C');
    });
  });

  describe('getSortOrderDescription', () => {
    it('should return custom order description when custom order exists', () => {
      const result = SortUtils.getSortOrderDescription('research', 'title', mockCustomOrder);

      expect(result).toBe('Custom Order');
    });

    it('should return alphabetical description for title sort', () => {
      const result = SortUtils.getSortOrderDescription('research', 'title', {});

      expect(result).toBe('Alphabetical (Title)');
    });

    it('should return last modified description for modified sort', () => {
      const result = SortUtils.getSortOrderDescription('research', 'modified', {});

      expect(result).toBe('Last Modified');
    });

    it('should return created date description for created sort', () => {
      const result = SortUtils.getSortOrderDescription('research', 'created', {});

      expect(result).toBe('Created Date');
    });

    it('should return default order description for custom sort', () => {
      const result = SortUtils.getSortOrderDescription('research', 'custom', {});

      expect(result).toBe('Default Order');
    });

    it('should return unknown for unknown sort type', () => {
      const result = SortUtils.getSortOrderDescription('research', 'unknown', {});

      expect(result).toBe('Unknown');
    });

    it('should prioritize custom order over sort order setting', () => {
      const result = SortUtils.getSortOrderDescription('research', 'modified', mockCustomOrder);

      expect(result).toBe('Custom Order');
    });

    it('should handle empty custom order', () => {
      const emptyCustomOrder = { research: [] };

      const result = SortUtils.getSortOrderDescription('research', 'title', emptyCustomOrder);

      expect(result).toBe('Alphabetical (Title)');
    });
  });
}); 