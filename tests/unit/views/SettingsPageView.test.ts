import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Obsidian modules
jest.mock('obsidian', () => ({
  ItemView: class MockItemView {
    constructor() {}
    getViewType() { return 'test'; }
    getDisplayText() { return 'Test'; }
  },
  Notice: jest.fn()
}));

describe('SettingsPageView', () => {
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
        showToastMessages: true,
        exportFolderPath: 'tag-exports',
        exportFileNameFormat: 'tag-{tag}.md'
      },
      saveSettings: jest.fn().mockImplementation(() => Promise.resolve())
    };
  });

  describe('basic functionality', () => {
    it('should be importable', () => {
      // This test ensures the module can be imported without errors
      expect(() => {
        require('../../../src/views/SettingsPageView');
      }).not.toThrow();
    });

    it('should have expected structure', () => {
      const { SettingsPageView } = require('../../../src/views/SettingsPageView');
      
      // Basic structure check
      expect(SettingsPageView).toBeDefined();
      expect(typeof SettingsPageView).toBe('function');
    });

    it('should extend ItemView', () => {
      const { SettingsPageView } = require('../../../src/views/SettingsPageView');
      const { ItemView } = require('obsidian');
      
      // Check if it extends ItemView
      expect(SettingsPageView.prototype).toBeInstanceOf(ItemView);
    });
  });
}); 