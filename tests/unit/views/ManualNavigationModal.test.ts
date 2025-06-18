import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Obsidian modules
jest.mock('obsidian', () => ({
  Modal: class MockModal {
    constructor() {}
    open() {}
    close() {}
  },
  Notice: jest.fn()
}));

describe('ManualNavigationModal', () => {
  let mockApp: any;
  let mockPlugin: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock app
    mockApp = {
      vault: {
        getMarkdownFiles: jest.fn().mockReturnValue([])
      },
      metadataCache: {
        getFileCache: jest.fn()
      }
    };

    // Mock plugin
    mockPlugin = {
      settings: {
        sortOrder: 'title',
        showToastMessages: true
      }
    };
  });

  describe('basic functionality', () => {
    it('should be importable', () => {
      // This test ensures the module can be imported without errors
      expect(() => {
        require('../../../src/views/ManualNavigationModal');
      }).not.toThrow();
    });

    it('should have expected structure', () => {
      const { ManualNavigationModal } = require('../../../src/views/ManualNavigationModal');
      
      // Basic structure check
      expect(ManualNavigationModal).toBeDefined();
      expect(typeof ManualNavigationModal).toBe('function');
    });
  });
}); 