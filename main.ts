import { 
	Plugin, 
	MarkdownView, 
	Notice,
	TFile,
	getAllTags
} from 'obsidian';

import { TagNavigatorSettings, DEFAULT_SETTINGS, NoteData, VIEW_TYPE_NAVIGATOR_PANEL } from './src/types';
import { FileManager } from './src/utils/FileManager';
import { NavigatorPanelView } from './src/views/NavigatorPanelView';
import { ManualNavigationModal } from './src/views/ManualNavigationModal';
import { TagNavigatorSettingTab } from './src/settings/TagNavigatorSettingTab';



export default class TagNavigatorPlugin extends Plugin {
	settings: TagNavigatorSettings;
	fileManager: FileManager;

	async onload() {
		await this.loadSettings();
		
		// Initialize file manager
		this.fileManager = new FileManager(this.app, this.settings.navigatorFolderPath);

		// Register view types
		this.registerView(
			VIEW_TYPE_NAVIGATOR_PANEL,
			(leaf) => new NavigatorPanelView(leaf, this)
		);

		// Add ribbon icon for manual navigation panel
		this.addRibbonIcon('navigation', 'Open Tag Navigator', () => {
			new ManualNavigationModal(this.app, this).open();
		});

		// Command to open manual navigation panel
		this.addCommand({
			id: 'open-manual-navigation',
			name: 'Navigator: Open manual navigation panel',
			callback: () => {
				new ManualNavigationModal(this.app, this).open();
			}
		});

		// Command to open/close next/prev panel
		this.addCommand({
			id: 'toggle-navigator-panel',
			name: 'Navigator: Toggle Next/Prev Panel',
			callback: () => {
				this.activateNavigatorPanel();
			}
		});

		// Commands for navigation
		this.addCommand({
			id: 'navigate-next',
			name: 'Navigator: Go to next note',
			callback: () => {
				this.navigateToNext();
			}
		});

		this.addCommand({
			id: 'navigate-prev',
			name: 'Navigator: Go to previous note',
			callback: () => {
				this.navigateToPrev();
			}
		});

		// Add settings tab
		this.addSettingTab(new TagNavigatorSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NAVIGATOR_PANEL);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update file manager path if changed
		if (this.fileManager) {
			this.fileManager = new FileManager(this.app, this.settings.navigatorFolderPath);
		}
	}

	async activateNavigatorPanel() {
		const { workspace } = this.app;
		
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NAVIGATOR_PANEL);

		if (leaves.length > 0) {
			// If panel exists, focus it
			workspace.revealLeaf(leaves[0]);
		} else {
			// Create new panel in right sidebar
			const leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_NAVIGATOR_PANEL, active: true });
				workspace.revealLeaf(leaf);
			}
		}
	}

	getAllNotesWithTags(): NoteData[] {
		const files = this.app.vault.getMarkdownFiles();
		const notesData: NoteData[] = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache) continue;

			const tags = getAllTags(cache) || [];
			const frontmatter = cache.frontmatter || {};
			
			if (tags.length > 0) {
				notesData.push({
					file,
					tags: tags.map(tag => tag.replace('#', '')),
					frontmatter,
					title: file.basename
				});
			}
		}

		return notesData;
	}

	getNotesForTag(tag: string): NoteData[] {
		const allNotes = this.getAllNotesWithTags();
		return allNotes.filter(note => note.tags.includes(tag));
	}

	async sortNotes(notes: NoteData[], tag: string): Promise<NoteData[]> {
		if (this.settings.sortOrder === 'custom') {
			const customOrder = await this.fileManager.loadTagOrder(tag);
			if (customOrder && customOrder.notes.length > 0) {
				return notes.sort((a, b) => {
					const aIndex = customOrder.notes.indexOf(a.file.path);
					const bIndex = customOrder.notes.indexOf(b.file.path);
					if (aIndex === -1 && bIndex === -1) return 0;
					if (aIndex === -1) return 1;
					if (bIndex === -1) return -1;
					return aIndex - bIndex;
				});
			}
		}

		switch (this.settings.sortOrder) {
			case 'title':
				return notes.sort((a, b) => a.title.localeCompare(b.title));
			case 'modified':
				return notes.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
			case 'created':
				return notes.sort((a, b) => b.file.stat.ctime - a.file.stat.ctime);
			default:
				return notes;
		}
	}

	async saveCustomOrder(tag: string, notes: NoteData[]): Promise<void> {
		const tagOrderData = {
			tag,
			sortOrder: 'custom' as const,
			notes: notes.map(note => note.file.path)
		};
		
		await this.fileManager.saveTagOrder(tagOrderData, notes);
	}

	getCurrentNote(): TFile | null {
		// First try to get the active markdown view
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView?.file) {
			return activeView.file;
		}

		// If no active markdown view, try to get the most recently active leaf with a file
		const activeLeaf = this.app.workspace.getMostRecentLeaf();
		if (activeLeaf?.view instanceof MarkdownView && activeLeaf.view.file) {
			return activeLeaf.view.file;
		}

		// Last resort: get any open markdown file
		const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
		for (const leaf of markdownLeaves) {
			if (leaf.view instanceof MarkdownView && leaf.view.file) {
				return leaf.view.file;
			}
		}

		return null;
	}

	async navigateToNext() {
		const currentFile = this.getCurrentNote();
		if (!currentFile) {
			if (this.settings.showToastMessages) {
				new Notice('No active note');
			}
			return;
		}

		const currentNoteData = this.getAllNotesWithTags().find(note => note.file.path === currentFile.path);
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			if (this.settings.showToastMessages) {
				new Notice('Current note has no tags');
			}
			return;
		}

		// Use the first tag for navigation
		const tag = currentNoteData.tags[0];
		const notesForTag = await this.sortNotes(this.getNotesForTag(tag), tag);
		
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		if (currentIndex === -1) return;

		const nextIndex = (currentIndex + 1) % notesForTag.length;
		const nextFile = notesForTag[nextIndex].file;

		await this.app.workspace.getLeaf().openFile(nextFile);
		
		if (this.settings.showToastMessages) {
			new Notice(`Next: ${nextFile.basename}`);
		}
	}

	async navigateToPrev() {
		const currentFile = this.getCurrentNote();
		if (!currentFile) {
			if (this.settings.showToastMessages) {
				new Notice('No active note');
			}
			return;
		}

		const currentNoteData = this.getAllNotesWithTags().find(note => note.file.path === currentFile.path);
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			if (this.settings.showToastMessages) {
				new Notice('Current note has no tags');
			}
			return;
		}

		// Use the first tag for navigation
		const tag = currentNoteData.tags[0];
		const notesForTag = await this.sortNotes(this.getNotesForTag(tag), tag);
		
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		if (currentIndex === -1) return;

		const prevIndex = currentIndex === 0 ? notesForTag.length - 1 : currentIndex - 1;
		const prevFile = notesForTag[prevIndex].file;

		await this.app.workspace.getLeaf().openFile(prevFile);
		
		if (this.settings.showToastMessages) {
			new Notice(`Previous: ${prevFile.basename}`);
		}
	}

	getAllTags(): string[] {
		const tags = new Set<string>();
		const allNotes = this.getAllNotesWithTags();
		
		for (const note of allNotes) {
			for (const tag of note.tags) {
				tags.add(tag);
			}
		}

		return Array.from(tags).sort();
	}
}
