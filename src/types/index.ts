import { TFile } from 'obsidian';

export interface TagNavigatorSettings {
	sortOrder: 'title' | 'modified' | 'created' | 'custom';
	showToastMessages: boolean;
	navigatorFolderPath: string;
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
	navigatorFolderPath: 'navigator'
};

export const VIEW_TYPE_NAVIGATOR_PANEL = "navigator-panel"; 