import { TFile } from 'obsidian';

export interface TagNavigatorSettings {
	sortOrder: 'title' | 'modified' | 'created' | 'custom';
	showToastMessages: boolean;
	customOrder: Record<string, string[]>; // tag -> ordered file paths
	exportFolderPath: string; // 导出文件夹路径
}

export interface NoteData {
	file: TFile;
	tags: string[];
	frontmatter: any;
	title: string;
}

export interface TagOrderData {
	tag: string;
	sortOrder: 'title' | 'modified' | 'created' | 'custom';
	notes: string[]; // Array of note paths in order
}

export const DEFAULT_SETTINGS: TagNavigatorSettings = {
	sortOrder: 'title',
	showToastMessages: true,
	customOrder: {},
	exportFolderPath: 'tag-exports' // 默认导出文件夹
};

export const VIEW_TYPE_NAVIGATOR_PANEL = "navigator-panel";
export const VIEW_TYPE_SETTINGS_PAGE = "tag-navigator-settings"; 