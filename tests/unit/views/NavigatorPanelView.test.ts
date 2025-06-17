import { NavigatorPanelView } from '../../../src/views/NavigatorPanelView';
import { WorkspaceLeaf, TFile } from 'obsidian';
import TagNavigatorPlugin from '../../../main';
import { TagNavigatorSettings } from '../../../src/types';

// Mock Obsidian API
jest.mock('obsidian', () => ({
	ItemView: class ItemView {
		app: any;
		leaf: WorkspaceLeaf;
		contentEl: HTMLElement;
		constructor(leaf: WorkspaceLeaf) {
			this.leaf = leaf;
			this.contentEl = document.createElement('div');
			this.app = {
				workspace: {
					getActiveViewOfType: jest.fn(),
					getMostRecentLeaf: jest.fn(),
					getLeavesOfType: jest.fn(),
					getLeaf: jest.fn(() => ({
						openFile: jest.fn()
					}))
				},
				vault: {
					getMarkdownFiles: jest.fn(),
				},
				metadataCache: {
					getFileCache: jest.fn(),
				}
			};
		}
	},
	MarkdownView: class MarkdownView {},
	Notice: jest.fn(),
	getAllTags: jest.fn(),
	WorkspaceLeaf: class WorkspaceLeaf {},
	TFile: class TFile {}
}));

describe('NavigatorPanelView - Duplicate Tags', () => {
	let mockPlugin: TagNavigatorPlugin;
	let mockLeaf: WorkspaceLeaf;
	let view: NavigatorPanelView;
	let mockFile: TFile;

	beforeEach(() => {
		// Create mock file
		mockFile = {
			path: 'test-note.md',
			basename: 'test-note',
			stat: {
				mtime: Date.now(),
				ctime: Date.now()
			}
		} as TFile;

		// Create mock plugin
		mockPlugin = {
			settings: {
				sortOrder: 'title',
				showToastMessages: true,
				customOrder: {},
				exportFolderPath: 'exports'
			} as TagNavigatorSettings,
			getCurrentNote: jest.fn(),
			getAllNotesWithTags: jest.fn(),
			getNotesForTag: jest.fn(),
			sortNotes: jest.fn(),
			app: {
				workspace: {
					getActiveViewOfType: jest.fn(),
					getMostRecentLeaf: jest.fn(),
					getLeavesOfType: jest.fn(),
					getLeaf: jest.fn(() => ({
						openFile: jest.fn()
					}))
				},
				vault: {
					getMarkdownFiles: jest.fn(),
				},
				metadataCache: {
					getFileCache: jest.fn(),
				}
			}
		} as unknown as TagNavigatorPlugin;

		// Create mock leaf
		mockLeaf = new WorkspaceLeaf();

		// Create view
		view = new NavigatorPanelView(mockLeaf, mockPlugin);
	});

	describe('duplicate tags handling', () => {
		it('should not display duplicate tags when a note has the same tag multiple times', async () => {
			// Mock current note with duplicate tags
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research', 'research', 'project', 'research', 'project'], // Duplicate tags
				frontmatter: {},
				title: 'test-note'
			};

			// Mock plugin methods
			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			// Render the view
			await view.render();

			// Check that DOM contains only unique tags
			const tagElements = view.contentEl.querySelectorAll('.tag-name');
			const tagTexts = Array.from(tagElements).map(el => el.textContent);
			
			// Should only have 2 unique tags: research and project
			expect(tagTexts).toHaveLength(2);
			expect(tagTexts).toContain('#research');
			expect(tagTexts).toContain('#project');
			
			// Check no duplicates
			const uniqueTags = [...new Set(tagTexts)];
			expect(tagTexts).toEqual(uniqueTags);
		});

		it('should handle empty tags array', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: [],
				frontmatter: {},
				title: 'test-note'
			};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);

			await view.render();

			const noTagsMessage = view.contentEl.querySelector('.no-tags');
			expect(noTagsMessage).toBeTruthy();
			expect(noTagsMessage?.textContent).toBe('Current note has no tags');
		});

		it('should handle single tag without duplicates', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research'],
				frontmatter: {},
				title: 'test-note'
			};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const tagElements = view.contentEl.querySelectorAll('.tag-name');
			expect(tagElements).toHaveLength(1);
			expect(tagElements[0].textContent).toBe('#research');
		});

		it('should handle multiple unique tags', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research', 'project', 'important'],
				frontmatter: {},
				title: 'test-note'
			};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const tagElements = view.contentEl.querySelectorAll('.tag-name');
			const tagTexts = Array.from(tagElements).map(el => el.textContent);
			
			expect(tagTexts).toHaveLength(3);
			expect(tagTexts).toContain('#research');
			expect(tagTexts).toContain('#project');
			expect(tagTexts).toContain('#important');
		});
	});

	describe('sort information display', () => {
		it('should display Custom when tag has custom order', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research'],
				frontmatter: {},
				title: 'test-note'
			};

			// Mock plugin with custom order for the tag
			mockPlugin.settings.customOrder = {
				'research': ['note1.md', 'note2.md']
			};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const sortInfo = view.contentEl.querySelector('.sort-info');
			expect(sortInfo?.textContent).toBe('Sort: Custom');
		});

		it('should display Title when using title sort order', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research'],
				frontmatter: {},
				title: 'test-note'
			};

			// Mock plugin with title sort order and no custom order
			mockPlugin.settings.sortOrder = 'title';
			mockPlugin.settings.customOrder = {};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const sortInfo = view.contentEl.querySelector('.sort-info');
			expect(sortInfo?.textContent).toBe('Sort: Title');
		});

		it('should display Modified when using modified sort order', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research'],
				frontmatter: {},
				title: 'test-note'
			};

			// Mock plugin with modified sort order and no custom order
			mockPlugin.settings.sortOrder = 'modified';
			mockPlugin.settings.customOrder = {};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const sortInfo = view.contentEl.querySelector('.sort-info');
			expect(sortInfo?.textContent).toBe('Sort: Modified');
		});

		it('should display Created when using created sort order', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research'],
				frontmatter: {},
				title: 'test-note'
			};

			// Mock plugin with created sort order and no custom order
			mockPlugin.settings.sortOrder = 'created';
			mockPlugin.settings.customOrder = {};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const sortInfo = view.contentEl.querySelector('.sort-info');
			expect(sortInfo?.textContent).toBe('Sort: Created');
		});

		it('should display Default when using unknown sort order', async () => {
			const mockCurrentNote = {
				file: mockFile,
				tags: ['research'],
				frontmatter: {},
				title: 'test-note'
			};

			// Mock plugin with unknown sort order and no custom order
			(mockPlugin.settings as any).sortOrder = 'unknown';
			mockPlugin.settings.customOrder = {};

			(mockPlugin.getCurrentNote as jest.Mock).mockReturnValue(mockFile);
			(mockPlugin.getAllNotesWithTags as jest.Mock).mockReturnValue([mockCurrentNote]);
			(mockPlugin.getNotesForTag as jest.Mock).mockImplementation((tag: string) => [mockCurrentNote]);
			(mockPlugin.sortNotes as jest.Mock).mockImplementation((notes: any[]) => notes);

			await view.render();

			const sortInfo = view.contentEl.querySelector('.sort-info');
			expect(sortInfo?.textContent).toBe('Sort: Default');
		});
	});
}); 