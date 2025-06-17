import { 
	Plugin, 
	MarkdownView, 
	Notice,
	TFile,
	getAllTags,
	TFolder
} from 'obsidian';

import { TagNavigatorSettings, DEFAULT_SETTINGS, NoteData, VIEW_TYPE_NAVIGATOR_PANEL, VIEW_TYPE_SETTINGS_PAGE } from './src/types';
import { NavigatorPanelView } from './src/views/NavigatorPanelView';
import { ManualNavigationModal } from './src/views/ManualNavigationModal';
import { SettingsPageView } from './src/views/SettingsPageView';

export default class TagNavigatorPlugin extends Plugin {
	settings: TagNavigatorSettings;

	async onload() {
		await this.loadSettings();

		// Register view types
		this.registerView(
			VIEW_TYPE_NAVIGATOR_PANEL,
			(leaf) => new NavigatorPanelView(leaf, this)
		);

		this.registerView(
			VIEW_TYPE_SETTINGS_PAGE,
			(leaf) => new SettingsPageView(leaf, this)
		);

		// Add ribbon icon for settings page
		this.addRibbonIcon('tag', 'Open Tag Navigator Settings', () => {
			this.activateSettingsPage();
		});

		// Command to open manual navigation panel
		this.addCommand({
			id: 'open-manual-navigation',
			name: 'Navigator: Open manual navigation panel',
			callback: () => {
				new ManualNavigationModal(this.app, this).open();
			}
		});

		// Command to open settings page
		this.addCommand({
			id: 'open-settings-page',
			name: 'Navigator: Open settings page',
			callback: () => {
				this.activateSettingsPage();
			}
		});

		// Command to export all tags
		this.addCommand({
			id: 'export-all-tags',
			name: 'Navigator: Export all tags to notes',
			callback: () => {
				this.exportAllTags();
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
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NAVIGATOR_PANEL);
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_SETTINGS_PAGE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

	async activateSettingsPage() {
		const { workspace } = this.app;
		
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_SETTINGS_PAGE);

		if (leaves.length > 0) {
			// If page exists, focus it
			workspace.revealLeaf(leaves[0]);
		} else {
			// Create new page
			const leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: VIEW_TYPE_SETTINGS_PAGE, active: true });
			workspace.revealLeaf(leaf);
		}
	}

	async exportAllTags() {
		const tags = this.getAllTags();
		if (tags.length === 0) {
			new Notice('No tags found to export');
			return;
		}

		// Ensure export folder exists
		await this.ensureExportFolderExists();

		let exportedCount = 0;
		let skippedCount = 0;

		for (const tag of tags) {
			try {
				const success = await this.exportTagToNote(tag);
				if (success) {
					exportedCount++;
				} else {
					skippedCount++;
				}
			} catch (error) {
				console.error(`Failed to export tag #${tag}:`, error);
				skippedCount++;
			}
		}

		if (this.settings.showToastMessages) {
			new Notice(`Export completed: ${exportedCount} tags exported${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`);
		}
	}

	async exportTagToNote(tag: string): Promise<boolean> {
		const notes = this.getNotesForTag(tag);
		if (notes.length === 0) {
			return false;
		}

		const sortedNotes = await this.sortNotes([...notes], tag);
		const exportFileName = `tag-${this.sanitizeFileName(tag)}.md`;
		const exportPath = `${this.settings.exportFolderPath}/${exportFileName}`;

		// Generate markdown content
		const content = this.generateTagNoteContent(tag, sortedNotes);

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(exportPath);
		
		if (existingFile instanceof TFile) {
			// Update existing file
			await this.app.vault.modify(existingFile, content);
		} else {
			// Create new file
			await this.app.vault.create(exportPath, content);
		}

		return true;
	}

	generateTagNoteContent(tag: string, notes: NoteData[]): string {
		const currentDate = new Date().toISOString().split('T')[0];
		const sortOrderText = this.getSortOrderDescription(tag);
		
		let content = `---\n`;
		content += `tag: ${tag}\n`;
		content += `generated: ${new Date().toISOString()}\n`;
		content += `total_notes: ${notes.length}\n`;
		content += `sort_order: ${this.settings.sortOrder}\n`;
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
	}

	getSortOrderDescription(tag: string): string {
		// Fix: Always check for custom order first, regardless of sortOrder setting
		if (this.settings.customOrder[tag] && this.settings.customOrder[tag].length > 0) {
			return 'Custom Order';
		}
		
		switch (this.settings.sortOrder) {
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
	}

	async ensureExportFolderExists() {
		const folderPath = this.settings.exportFolderPath;
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	sanitizeFileName(tag: string): string {
		// Remove invalid characters for file names
		return tag.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
	}

	async exportSingleTag(tag: string): Promise<void> {
		await this.ensureExportFolderExists();
		
		const success = await this.exportTagToNote(tag);
		
		if (success) {
			if (this.settings.showToastMessages) {
				new Notice(`Tag #${tag} exported successfully`);
			}
		} else {
			if (this.settings.showToastMessages) {
				new Notice(`No notes found for tag #${tag}`);
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
		// Fix: Always check for custom order first, regardless of sortOrder setting
		if (this.settings.customOrder[tag] && this.settings.customOrder[tag].length > 0) {
			const customOrder = this.settings.customOrder[tag];
			return notes.sort((a, b) => {
				const aIndex = customOrder.indexOf(a.file.path);
				const bIndex = customOrder.indexOf(b.file.path);
				if (aIndex === -1 && bIndex === -1) return 0;
				if (aIndex === -1) return 1;
				if (bIndex === -1) return -1;
				return aIndex - bIndex;
			});
		}

		// If no custom order, use the sortOrder setting
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

	async saveCustomOrder(tag: string, filePaths: string[]): Promise<void> {
		this.settings.customOrder[tag] = filePaths;
		await this.saveSettings();
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
