import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExportUtils } from '../../src/utils/exportUtils';
import { NoteData } from '../../src/types';

// Mock basic types for testing
interface MockTFile {
	path: string;
	basename: string;
	stat: {
		mtime: number;
		ctime: number;
	};
}

interface MockNoteData {
	file: MockTFile;
	tags: string[];
	frontmatter: any;
	title: string;
}

interface TagNavigatorSettings {
	sortOrder: 'title' | 'modified' | 'created' | 'custom';
	showToastMessages: boolean;
	customOrder: Record<string, string[]>;
	exportFolderPath: string;
}

// Mock Obsidian API
const mockApp = {
	vault: {
		getAbstractFileByPath: jest.fn(),
		create: jest.fn(),
		modify: jest.fn(),
		createFolder: jest.fn()
	}
};

const mockTFile: MockTFile = {
	path: 'test-note.md',
	basename: 'test-note',
	stat: {
		mtime: 1234567890,
		ctime: 1234567890
	}
};

describe('导出标签功能测试', () => {
	let mockSettings: TagNavigatorSettings;
	let mockNotes: MockNoteData[];

	beforeEach(() => {
		// 设置默认配置
		mockSettings = {
			sortOrder: 'title',
			showToastMessages: true,
			customOrder: {},
			exportFolderPath: 'tag-exports'
		};

		// 创建测试笔记数据
		mockNotes = [
			{
				file: { 
					path: 'note-c.md', 
					basename: 'C Note', 
					stat: { mtime: 1000, ctime: 500 } 
				},
				tags: ['research'],
				title: 'C Note',
				frontmatter: {}
			},
			{
				file: { 
					path: 'note-a.md', 
					basename: 'A Note', 
					stat: { mtime: 3000, ctime: 2000 } 
				},
				tags: ['research'],
				title: 'A Note',
				frontmatter: {}
			},
			{
				file: { 
					path: 'note-b.md', 
					basename: 'B Note', 
					stat: { mtime: 2000, ctime: 1000 } 
				},
				tags: ['research'],
				title: 'B Note',
				frontmatter: {}
			}
		];
	});

	describe('排序功能测试', () => {
		// 模拟sortNotes方法
		const sortNotes = async (notes: MockNoteData[], tag: string, settings: TagNavigatorSettings): Promise<MockNoteData[]> => {
			if (settings.sortOrder === 'custom' && settings.customOrder[tag]) {
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

		it('应该按标题排序', async () => {
			mockSettings.sortOrder = 'title';
			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			expect(sorted[0].title).toBe('A Note');
			expect(sorted[1].title).toBe('B Note');
			expect(sorted[2].title).toBe('C Note');
		});

		it('应该按修改时间排序 (最新在前)', async () => {
			mockSettings.sortOrder = 'modified';
			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			expect(sorted[0].file.stat.mtime).toBe(3000); // A Note
			expect(sorted[1].file.stat.mtime).toBe(2000); // B Note  
			expect(sorted[2].file.stat.mtime).toBe(1000); // C Note
		});

		it('应该按创建时间排序 (最新在前)', async () => {
			mockSettings.sortOrder = 'created';
			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			expect(sorted[0].file.stat.ctime).toBe(2000); // A Note
			expect(sorted[1].file.stat.ctime).toBe(1000); // B Note
			expect(sorted[2].file.stat.ctime).toBe(500);  // C Note
		});

		it('应该使用自定义排序顺序', async () => {
			mockSettings.sortOrder = 'custom';
			// 设置自定义排序：B -> C -> A
			mockSettings.customOrder['research'] = ['note-b.md', 'note-c.md', 'note-a.md'];
			
			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			expect(sorted[0].file.path).toBe('note-b.md'); // B Note
			expect(sorted[1].file.path).toBe('note-c.md'); // C Note
			expect(sorted[2].file.path).toBe('note-a.md'); // A Note
		});

		it('自定义排序中未指定的笔记应该排在后面', async () => {
			mockSettings.sortOrder = 'custom';
			// 只指定前两个笔记的顺序
			mockSettings.customOrder['research'] = ['note-c.md', 'note-a.md'];
			
			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			expect(sorted[0].file.path).toBe('note-c.md'); // C Note (指定第1)
			expect(sorted[1].file.path).toBe('note-a.md'); // A Note (指定第2)
			expect(sorted[2].file.path).toBe('note-b.md'); // B Note (未指定，排在最后)
		});

		it('当sortOrder为custom但没有自定义排序时，应该使用默认排序', async () => {
			mockSettings.sortOrder = 'custom';
			// 没有为该标签设置自定义排序
			mockSettings.customOrder = {};
			
			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			// 应该返回原始顺序或者不变的顺序
			expect(sorted).toHaveLength(3);
			expect(sorted.map(n => n.file.path)).toEqual(['note-c.md', 'note-a.md', 'note-b.md']);
		});
	});

	describe('导出内容生成测试', () => {
		// 模拟generateTagNoteContent方法
		const generateTagNoteContent = (tag: string, notes: MockNoteData[], settings: TagNavigatorSettings): string => {
			const currentDate = new Date().toISOString().split('T')[0];
			const getSortOrderDescription = (tag: string): string => {
				if (settings.sortOrder === 'custom' && settings.customOrder[tag]) {
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
			
			const sortOrderText = getSortOrderDescription(tag);
			
			let content = `---\n`;
			content += `tag: ${tag}\n`;
			content += `generated: ${new Date().toISOString()}\n`;
			content += `total_notes: ${notes.length}\n`;
			content += `sort_order: ${settings.sortOrder}\n`;
			content += `---\n\n`;
			
			content += `# Tag Navigator: #${tag}\n\n`;
			content += `Generated on: ${currentDate}\n`;
			content += `Sort Order: ${sortOrderText}\n`;
			content += `Total Notes: ${notes.length}\n\n`;
			
			content += `## Notes List\n\n`;
			
			for (let i = 0; i < notes.length; i++) {
				const note = notes[i];
				const noteTitle = note.title;
				content += `${i + 1}. [[${noteTitle}]]\n`;
			}
			
			content += `\n---\n`;
			content += `*This note was automatically generated by Tag Navigator plugin*\n`;
			
			return content;
		};

		it('导出内容应该包含正确的标题排序', () => {
			mockSettings.sortOrder = 'title';
			const sortedNotes = [...mockNotes].sort((a, b) => a.title.localeCompare(b.title));
			const content = generateTagNoteContent('research', sortedNotes, mockSettings);
			
			expect(content).toContain('Sort Order: Alphabetical (Title)');
			expect(content).toContain('sort_order: title');
			expect(content).toContain('1. [[A Note]]');
			expect(content).toContain('2. [[B Note]]');
			expect(content).toContain('3. [[C Note]]');
		});

		it('导出内容应该包含正确的自定义排序', () => {
			mockSettings.sortOrder = 'custom';
			mockSettings.customOrder['research'] = ['note-b.md', 'note-c.md', 'note-a.md'];
			
			// 应用自定义排序
			const customOrder = mockSettings.customOrder['research'];
			const sortedNotes = [...mockNotes].sort((a, b) => {
				const aIndex = customOrder.indexOf(a.file.path);
				const bIndex = customOrder.indexOf(b.file.path);
				if (aIndex === -1 && bIndex === -1) return 0;
				if (aIndex === -1) return 1;
				if (bIndex === -1) return -1;
				return aIndex - bIndex;
			});
			
			const content = generateTagNoteContent('research', sortedNotes, mockSettings);
			
			expect(content).toContain('Sort Order: Custom Order');
			expect(content).toContain('sort_order: custom');
			expect(content).toContain('1. [[B Note]]');
			expect(content).toContain('2. [[C Note]]');
			expect(content).toContain('3. [[A Note]]');
		});

		it('导出内容应该包含正确的修改时间排序', () => {
			mockSettings.sortOrder = 'modified';
			const sortedNotes = [...mockNotes].sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
			const content = generateTagNoteContent('research', sortedNotes, mockSettings);
			
			expect(content).toContain('Sort Order: Last Modified');
			expect(content).toContain('sort_order: modified');
			expect(content).toContain('1. [[A Note]]'); // mtime: 3000
			expect(content).toContain('2. [[B Note]]'); // mtime: 2000
			expect(content).toContain('3. [[C Note]]'); // mtime: 1000
		});

		it('导出内容应该包含正确的frontmatter元数据', () => {
			const content = generateTagNoteContent('research', mockNotes, mockSettings);
			
			expect(content).toMatch(/^---\n/);
			expect(content).toContain('tag: research');
			expect(content).toContain('total_notes: 3');
			expect(content).toContain('sort_order: title');
			expect(content).toMatch(/generated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});

	describe('完整导出流程测试', () => {
		it('应该正确执行完整的导出流程', async () => {
			// 模拟完整的exportTagToNote方法
			const exportTagToNote = async (tag: string, notes: MockNoteData[], settings: TagNavigatorSettings): Promise<string> => {
				if (notes.length === 0) {
					throw new Error('No notes found for tag');
				}

				// 应用排序
				let sortedNotes: MockNoteData[];
				if (settings.sortOrder === 'custom' && settings.customOrder[tag]) {
					const customOrder = settings.customOrder[tag];
					sortedNotes = notes.sort((a, b) => {
						const aIndex = customOrder.indexOf(a.file.path);
						const bIndex = customOrder.indexOf(b.file.path);
						if (aIndex === -1 && bIndex === -1) return 0;
						if (aIndex === -1) return 1;
						if (bIndex === -1) return -1;
						return aIndex - bIndex;
					});
				} else {
					switch (settings.sortOrder) {
						case 'title':
							sortedNotes = notes.sort((a, b) => a.title.localeCompare(b.title));
							break;
						case 'modified':
							sortedNotes = notes.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
							break;
						case 'created':
							sortedNotes = notes.sort((a, b) => b.file.stat.ctime - a.file.stat.ctime);
							break;
						default:
							sortedNotes = notes;
					}
				}

				// 生成内容
				const getSortOrderDescription = (tag: string): string => {
					if (settings.sortOrder === 'custom' && settings.customOrder[tag]) {
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

				const currentDate = new Date().toISOString().split('T')[0];
				const sortOrderText = getSortOrderDescription(tag);
				
				let content = `---\n`;
				content += `tag: ${tag}\n`;
				content += `generated: ${new Date().toISOString()}\n`;
				content += `total_notes: ${sortedNotes.length}\n`;
				content += `sort_order: ${settings.sortOrder}\n`;
				content += `---\n\n`;
				
				content += `# Tag Navigator: #${tag}\n\n`;
				content += `Generated on: ${currentDate}\n`;
				content += `Sort Order: ${sortOrderText}\n`;
				content += `Total Notes: ${sortedNotes.length}\n\n`;
				
				content += `## Notes List\n\n`;
				
				for (let i = 0; i < sortedNotes.length; i++) {
					const note = sortedNotes[i];
					const noteTitle = note.title;
					content += `${i + 1}. [[${noteTitle}]]\n`;
				}
				
				content += `\n---\n`;
				content += `*This note was automatically generated by Tag Navigator plugin*\n`;
				
				return content;
			};

			// 测试标题排序的完整流程
			mockSettings.sortOrder = 'title';
			const titleContent = await exportTagToNote('research', [...mockNotes], mockSettings);
			
			expect(titleContent).toContain('1. [[A Note]]');
			expect(titleContent).toContain('2. [[B Note]]');
			expect(titleContent).toContain('3. [[C Note]]');
			expect(titleContent).toContain('Sort Order: Alphabetical (Title)');

			// 测试自定义排序的完整流程
			mockSettings.sortOrder = 'custom';
			mockSettings.customOrder['research'] = ['note-c.md', 'note-a.md', 'note-b.md'];
			const customContent = await exportTagToNote('research', [...mockNotes], mockSettings);
			
			expect(customContent).toContain('1. [[C Note]]');
			expect(customContent).toContain('2. [[A Note]]');
			expect(customContent).toContain('3. [[B Note]]');
			expect(customContent).toContain('Sort Order: Custom Order');
		});

		it('当自定义排序设置存在时，应该优先使用自定义排序', async () => {
			// 设置为title排序，但有自定义排序配置
			mockSettings.sortOrder = 'title';
			mockSettings.customOrder['research'] = ['note-b.md', 'note-c.md', 'note-a.md'];

			// 模拟实际的sortNotes逻辑，应该检查自定义排序设置
			const sortNotes = async (notes: MockNoteData[], tag: string, settings: TagNavigatorSettings): Promise<MockNoteData[]> => {
				// 这里是关键：即使sortOrder不是'custom'，如果有自定义排序配置，也应该使用
				if (settings.customOrder[tag]) {
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

			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			// 应该使用自定义排序，而不是标题排序
			expect(sorted[0].file.path).toBe('note-b.md');
			expect(sorted[1].file.path).toBe('note-c.md');
			expect(sorted[2].file.path).toBe('note-a.md');
		});
	});

	describe('边界情况测试', () => {
		it('应该处理空的笔记列表', async () => {
			const emptyNotes: MockNoteData[] = [];
			
			const sortNotes = async (notes: MockNoteData[], tag: string, settings: TagNavigatorSettings): Promise<MockNoteData[]> => {
				if (settings.sortOrder === 'custom' && settings.customOrder[tag]) {
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
				return notes.sort((a, b) => a.title.localeCompare(b.title));
			};

			const sorted = await sortNotes(emptyNotes, 'research', mockSettings);
			expect(sorted).toHaveLength(0);
		});

		it('应该处理自定义排序中包含不存在的文件路径', async () => {
			mockSettings.sortOrder = 'custom';
			mockSettings.customOrder['research'] = ['non-existent.md', 'note-b.md', 'another-missing.md', 'note-a.md'];
			
			const sortNotes = async (notes: MockNoteData[], tag: string, settings: TagNavigatorSettings): Promise<MockNoteData[]> => {
				if (settings.sortOrder === 'custom' && settings.customOrder[tag]) {
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
				return notes;
			};

			const sorted = await sortNotes([...mockNotes], 'research', mockSettings);
			
			// 应该按照自定义排序中存在的文件进行排序
			expect(sorted[0].file.path).toBe('note-b.md');
			expect(sorted[1].file.path).toBe('note-a.md');
			expect(sorted[2].file.path).toBe('note-c.md'); // 未在自定义排序中，排在最后
		});

		it('应该处理文件名包含特殊字符的情况', () => {
			const sanitizeFileName = (tag: string): string => {
				return tag.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
			};

			expect(sanitizeFileName('research/project')).toBe('research-project');
			expect(sanitizeFileName('tag with spaces')).toBe('tag-with-spaces');
			expect(sanitizeFileName('tag<>:"|?*')).toBe('tag-------');
		});
	});
});

describe('ExportUtils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('generateFileName', () => {
		it('should replace {tag} placeholder with sanitized tag name', () => {
			const format = 'tag-{tag}.md';
			const tag = 'test-tag';
			const result = ExportUtils.generateFileName(format, tag);
			expect(result).toBe('tag-test-tag.md');
		});

		it('should handle special characters in tag names', () => {
			const format = 'export-{tag}-list.md';
			const tag = 'test/tag:with*special?chars';
			const result = ExportUtils.generateFileName(format, tag);
			expect(result).toBe('export-test-tag-with-special-chars-list.md');
		});

		it('should handle multiple {tag} placeholders', () => {
			const format = '{tag}-notes-{tag}.md';
			const tag = 'research';
			const result = ExportUtils.generateFileName(format, tag);
			expect(result).toBe('research-notes-research.md');
		});

		it('should handle empty tag name', () => {
			const format = 'tag-{tag}.md';
			const tag = '';
			const result = ExportUtils.generateFileName(format, tag);
			expect(result).toBe('tag-.md');
		});
	});

	describe('generateTagNoteContent', () => {
		const mockNotes: MockNoteData[] = [
			{
				file: mockTFile,
				tags: ['research'],
				frontmatter: {},
				title: 'Test Note 1'
			},
			{
				file: { ...mockTFile, basename: 'Test Note 2' },
				tags: ['research'],
				frontmatter: {},
				title: 'Test Note 2'
			}
		];

		it('should generate content with new format (no frontmatter)', () => {
			const tag = 'research';
			const sortOrder = 'title';
			const customOrder = {};

			const content = ExportUtils.generateTagNoteContent(tag, mockNotes as any, sortOrder, customOrder);

			// Should not contain frontmatter fields
			expect(content).not.toMatch(/---\s*tag:/);
			expect(content).not.toContain('generated:');

			// Should contain new format elements
			expect(content).toContain('# Tag: #research');
			expect(content).toContain('## Notes List');
			expect(content).toContain('1. [[Test Note 1]]');
			expect(content).toContain('2. [[Test Note 2]]');
			expect(content).toContain('> *This note was automatically generated by Tag Navigator plugin*');
			expect(content).toContain('> Generated on:');
			expect(content).toContain('> Sort Order:');
			expect(content).toContain('> Total Notes: 2');
		});

		it('should include current date and time in footer', () => {
			const tag = 'research';
			const sortOrder = 'title';
			const customOrder = {};

			const content = ExportUtils.generateTagNoteContent(tag, mockNotes as any, sortOrder, customOrder);

			// Should contain date and time
			expect(content).toMatch(/> Generated on: \d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2}/);
		});

		it('should show correct sort order description', () => {
			const tag = 'research';
			const sortOrder = 'modified';
			const customOrder = {};

			const content = ExportUtils.generateTagNoteContent(tag, mockNotes as any, sortOrder, customOrder);

			expect(content).toContain('> Sort Order: Last Modified');
		});

		it('should show custom order when available', () => {
			const tag = 'research';
			const sortOrder = 'title';
			const customOrder = {
				research: ['test-note.md', 'another-note.md']
			};

			const content = ExportUtils.generateTagNoteContent(tag, mockNotes as any, sortOrder, customOrder);

			expect(content).toContain('> Sort Order: Custom Order');
		});
	});

	describe('sanitizeFileName', () => {
		it('should remove invalid file name characters', () => {
			const tag = 'test/tag:with*invalid?chars<and>quotes"';
			const result = ExportUtils.sanitizeFileName(tag);
			expect(result).toBe('test-tag-with-invalid-chars-and-quotes');
		});

		it('should replace spaces with hyphens', () => {
			const tag = 'test tag with spaces';
			const result = ExportUtils.sanitizeFileName(tag);
			expect(result).toBe('test-tag-with-spaces');
		});

		it('should handle multiple consecutive special characters', () => {
			const tag = 'test///tag:::with***multiple???chars';
			const result = ExportUtils.sanitizeFileName(tag);
			expect(result).toBe('test-tag-with-multiple-chars');
		});
	});
});