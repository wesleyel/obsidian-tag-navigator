import { jest, describe, it, expect } from '@jest/globals';

// Mock the individual utility modules
jest.mock('../../src/utils/noteUtils', () => ({
  NoteUtils: {
    getAllNotesWithTags: jest.fn(),
    getNotesForTag: jest.fn(),
    getAllTags: jest.fn(),
    getCurrentNote: jest.fn(),
    sanitizeFileName: jest.fn()
  }
}));

jest.mock('../../src/utils/sortUtils', () => ({
  SortUtils: {
    sortNotes: jest.fn(),
    getSortOrderDescription: jest.fn()
  }
}));

jest.mock('../../src/utils/exportUtils', () => ({
  ExportUtils: {
    ensureExportFolderExists: jest.fn(),
    generateFileName: jest.fn(),
    exportTagToNote: jest.fn(),
    generateTagNoteContent: jest.fn(),
    sanitizeFileName: jest.fn()
  }
}));

jest.mock('../../src/utils/navigationUtils', () => ({
  NavigationUtils: {
    navigateToNext: jest.fn(),
    navigateToPrev: jest.fn()
  }
}));

describe('Utils Index Module', () => {
  it('should export NoteUtils', async () => {
    const { NoteUtils } = await import('../../src/utils/index');
    expect(NoteUtils).toBeDefined();
    expect(typeof NoteUtils.getAllNotesWithTags).toBe('function');
    expect(typeof NoteUtils.getNotesForTag).toBe('function');
    expect(typeof NoteUtils.getAllTags).toBe('function');
    expect(typeof NoteUtils.getCurrentNote).toBe('function');
    expect(typeof NoteUtils.sanitizeFileName).toBe('function');
  });

  it('should export SortUtils', async () => {
    const { SortUtils } = await import('../../src/utils/index');
    expect(SortUtils).toBeDefined();
    expect(typeof SortUtils.sortNotes).toBe('function');
    expect(typeof SortUtils.getSortOrderDescription).toBe('function');
  });

  it('should export ExportUtils', async () => {
    const { ExportUtils } = await import('../../src/utils/index');
    expect(ExportUtils).toBeDefined();
    expect(typeof ExportUtils.ensureExportFolderExists).toBe('function');
    expect(typeof ExportUtils.generateFileName).toBe('function');
    expect(typeof ExportUtils.exportTagToNote).toBe('function');
    expect(typeof ExportUtils.generateTagNoteContent).toBe('function');
    expect(typeof ExportUtils.sanitizeFileName).toBe('function');
  });

  it('should export NavigationUtils', async () => {
    const { NavigationUtils } = await import('../../src/utils/index');
    expect(NavigationUtils).toBeDefined();
    expect(typeof NavigationUtils.navigateToNext).toBe('function');
    expect(typeof NavigationUtils.navigateToPrev).toBe('function');
  });

  it('should export all utility classes', async () => {
    const utils = await import('../../src/utils/index');
    expect(utils).toHaveProperty('NoteUtils');
    expect(utils).toHaveProperty('SortUtils');
    expect(utils).toHaveProperty('ExportUtils');
    expect(utils).toHaveProperty('NavigationUtils');
  });
}); 