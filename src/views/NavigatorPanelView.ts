import { ItemView, WorkspaceLeaf, Notice, TFile, MarkdownView } from 'obsidian';
import { VIEW_TYPE_NAVIGATOR_PANEL } from '../types';
import type TagNavigatorPlugin from '../../main';

export class NavigatorPanelView extends ItemView {
	plugin: TagNavigatorPlugin;
	refreshInterval: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TagNavigatorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_NAVIGATOR_PANEL;
	}

	getDisplayText() {
		return "Navigator Panel";
	}

	getIcon() {
		return "compass";
	}

	async onOpen() {
		this.render();
		
		// Set up auto-refresh every 2 seconds
		this.refreshInterval = window.setInterval(() => {
			this.render();
		}, 2000);
	}

	async onClose() {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
	}

	async render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tag-navigator-panel');
		const currentFile = this.plugin.getCurrentNote();
		
		if (!currentFile) {
			const debugInfo = contentEl.createEl('div', { cls: 'debug-info' });
			debugInfo.createEl('p', { text: 'Debug: No active note detected' });
			
			const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			debugInfo.createEl('p', { text: `Active view: ${activeMarkdownView ? 'Found' : 'None'}` });
			
			contentEl.createEl('div', { 
				cls: 'no-active-note', 
				text: 'No active note or note has no tags' 
			});
			return;
		}

		// Display current file info
		const fileInfoEl = contentEl.createEl('div', { cls: 'current-file-info' });
		fileInfoEl.createEl('strong', { text: 'Current: ' });
		fileInfoEl.createEl('span', { text: currentFile.basename });

		const currentNote = this.plugin.getAllNotesWithTags().find(note => note.file.path === currentFile.path);
		
		if (!currentNote || currentNote.tags.length === 0) {
			contentEl.createEl('div', { 
				cls: 'no-tags', 
				text: 'Current note has no tags' 
			});
			return;
		}

		// Display tags and navigation
		const tagsContainer = contentEl.createEl('div', { cls: 'tags-container' });

		// 去重标签
		const uniqueTags = Array.from(new Set(currentNote.tags));
		for (const tag of uniqueTags) {
			const tagEl = tagsContainer.createEl('div', { cls: 'tag-section' });
			
			const tagHeader = tagEl.createEl('div', { cls: 'tag-header' });
			tagHeader.createEl('span', { text: `#${tag}`, cls: 'tag-name' });

			// Get notes for this tag and current position
			const notesForTag = await this.plugin.sortNotes(this.plugin.getNotesForTag(tag), tag);
			const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
			const totalNotes = notesForTag.length;

			// Position info
			if (currentIndex !== -1) {
				const positionEl = tagHeader.createEl('span', { cls: 'position-info' });
				positionEl.textContent = `[${currentIndex + 1}/${totalNotes}]`;
			}

			// Navigation buttons
			const navButtons = tagEl.createEl('div', { cls: 'nav-buttons' });
			
			const prevBtn = navButtons.createEl('button', { text: 'Prev', cls: 'nav-btn prev-btn' });
			prevBtn.onclick = async () => {
				await this.navigateInTag(tag, 'prev');
			};

			const nextBtn = navButtons.createEl('button', { text: 'Next', cls: 'nav-btn next-btn' });
			nextBtn.onclick = async () => {
				await this.navigateInTag(tag, 'next');
			};

			// Show sort method
			const sortInfo = tagEl.createEl('div', { cls: 'sort-info' });
			let sortText = 'Default';
			if (this.plugin.settings.sortOrder === 'custom' && this.plugin.settings.customOrder[tag]) {
				sortText = 'Custom';
			} else if (this.plugin.settings.sortOrder !== 'title') {
				sortText = this.plugin.settings.sortOrder.charAt(0).toUpperCase() + this.plugin.settings.sortOrder.slice(1);
			}
			sortInfo.textContent = `Sort: ${sortText}`;
		}
	}

	async navigateInTag(tag: string, direction: 'next' | 'prev') {
		const currentFile = this.plugin.getCurrentNote();
		if (!currentFile) return;

		const notesForTag = await this.plugin.sortNotes(this.plugin.getNotesForTag(tag), tag);
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		
		if (currentIndex === -1) return;

		let targetIndex: number;
		if (direction === 'next') {
			targetIndex = (currentIndex + 1) % notesForTag.length;
		} else {
			targetIndex = currentIndex === 0 ? notesForTag.length - 1 : currentIndex - 1;
		}

		const targetFile = notesForTag[targetIndex].file;
		await this.app.workspace.getLeaf().openFile(targetFile);
		
		if (this.plugin.settings.showToastMessages) {
			const directionText = direction === 'next' ? 'Next' : 'Previous';
			new Notice(`${directionText}: ${targetFile.basename}`);
		}

		// Refresh the panel after navigation
		setTimeout(() => {
			this.render();
		}, 100);
	}
} 