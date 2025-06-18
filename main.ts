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
import { NoteUtils, SortUtils, ExportUtils, NavigationUtils } from './src/utils';

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
		const tags = NoteUtils.getAllTags(this.app);
		if (tags.length === 0) {
			new Notice('No tags found to export');
			return;
		}

		// Ensure export folder exists
		await ExportUtils.ensureExportFolderExists(this.app, this.settings.exportFolderPath);

		let exportedCount = 0;
		let skippedCount = 0;

		for (const tag of tags) {
			try {
				const notes = NoteUtils.getNotesForTag(this.app, tag);
				const success = await ExportUtils.exportTagToNote(
					this.app,
					tag,
					notes,
					this.settings.exportFolderPath,
					this.settings.sortOrder,
					this.settings.customOrder
				);
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

	async exportSingleTag(tag: string): Promise<void> {
		await ExportUtils.ensureExportFolderExists(this.app, this.settings.exportFolderPath);
		
		const notes = NoteUtils.getNotesForTag(this.app, tag);
		const success = await ExportUtils.exportTagToNote(
			this.app,
			tag,
			notes,
			this.settings.exportFolderPath,
			this.settings.sortOrder,
			this.settings.customOrder
		);
		
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

	async sortNotes(notes: NoteData[], tag: string): Promise<NoteData[]> {
		return SortUtils.sortNotes(notes, tag, this.settings.sortOrder, this.settings.customOrder);
	}

	async saveCustomOrder(tag: string, filePaths: string[]): Promise<void> {
		this.settings.customOrder[tag] = filePaths;
		await this.saveSettings();
	}

	async navigateToNext() {
		await NavigationUtils.navigateToNext(
			this.app,
			this.settings.showToastMessages,
			this.settings.sortOrder,
			this.settings.customOrder
		);
	}

	async navigateToPrev() {
		await NavigationUtils.navigateToPrev(
			this.app,
			this.settings.showToastMessages,
			this.settings.sortOrder,
			this.settings.customOrder
		);
	}

	// Public methods for views to access
	getAllNotesWithTags(): NoteData[] {
		return NoteUtils.getAllNotesWithTags(this.app);
	}

	getNotesForTag(tag: string): NoteData[] {
		return NoteUtils.getNotesForTag(this.app, tag);
	}

	getAllTags(): string[] {
		return NoteUtils.getAllTags(this.app);
	}

	getCurrentNote(): TFile | null {
		return NoteUtils.getCurrentNote(this.app);
	}
}
