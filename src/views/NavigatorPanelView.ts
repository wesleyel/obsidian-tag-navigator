import { ItemView, WorkspaceLeaf, Notice, getAllTags } from 'obsidian';
import { VIEW_TYPE_NAVIGATOR_PANEL } from '../types';
import type TagNavigatorPlugin from '../../main';

export class NavigatorPanelView extends ItemView {
	plugin: TagNavigatorPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: TagNavigatorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_NAVIGATOR_PANEL;
	}

	getDisplayText() {
		return "Tag Navigator";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Tag Navigator" });

		this.renderTagList(container);

		// Refresh when files change or active file changes
		this.registerEvent(
			this.app.vault.on('modify', () => {
				this.refresh();
			})
		);
		
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				// Delay refresh to allow metadata cache to update
				setTimeout(() => {
					this.refresh();
				}, 100);
			})
		);

		// Also refresh when metadata cache is updated
		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.refresh();
			})
		);
	}

	async refresh() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Tag Navigator" });
		this.renderTagList(container);
	}

	async renderTagList(container: Element) {
		const currentFile = this.plugin.getCurrentNote();
		
		if (!currentFile) {
			container.createEl("p", { text: "No active note" });
			// Add debug info
			container.createEl("p", { 
				text: "Debug: Please ensure you have a markdown file open and focused.", 
				cls: "tag-navigator-debug" 
			});
			return;
		}

		// Show current file name for debugging
		container.createEl("p", { 
			text: `Current: ${currentFile.basename}`, 
			cls: "tag-navigator-current-file" 
		});

		const currentNoteData = this.plugin.getAllNotesWithTags().find(note => note.file.path === currentFile.path);
		
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			container.createEl("p", { text: "Current note has no tags" });
			// Try to get all notes and see if this file has any metadata
			const allFiles = this.plugin.app.vault.getMarkdownFiles();
			const targetFile = allFiles.find(f => f.path === currentFile.path);
			if (targetFile) {
				const cache = this.plugin.app.metadataCache.getFileCache(targetFile);
				const debugText = cache ? `Cache found. Tags in cache: ${getAllTags(cache)?.join(', ') || 'none'}` : 'No cache found';
				container.createEl("p", { text: `Debug: ${debugText}`, cls: "tag-navigator-debug" });
			}
			return;
		}

		const currentNoteTags = currentNoteData.tags;

		for (const tag of currentNoteTags) {
			const tagContainer = container.createEl("div", { cls: "tag-navigator-tag" });
			tagContainer.createEl("h5", { text: `#${tag}` });

			const buttonContainer = tagContainer.createEl("div", { cls: "tag-navigator-buttons" });
			
			const prevButton = buttonContainer.createEl("button", { text: "Prev" });
			prevButton.onclick = async () => {
				await this.navigateInTag(tag, 'prev');
			};

			const nextButton = buttonContainer.createEl("button", { text: "Next" });
			nextButton.onclick = async () => {
				await this.navigateInTag(tag, 'next');
			};

			// Show notes count for this tag
			const notesCount = this.plugin.getNotesForTag(tag).length;
			tagContainer.createEl("span", { text: `(${notesCount} notes)`, cls: "tag-navigator-count" });
			
			// Show current position in this tag
			const notesForTag = await this.plugin.sortNotes(this.plugin.getNotesForTag(tag), tag);
			const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
			if (currentIndex !== -1) {
				tagContainer.createEl("span", { 
					text: `[${currentIndex + 1}/${notesCount}]`, 
					cls: "tag-navigator-position" 
				});
			}
		}
	}

	async navigateInTag(tag: string, direction: 'next' | 'prev') {
		const currentFile = this.plugin.getCurrentNote();
		if (!currentFile) {
					new Notice('No active note');
			return;
		}

		const notesForTag = await this.plugin.sortNotes(this.plugin.getNotesForTag(tag), tag);
		if (notesForTag.length === 0) return;

		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		
		let targetIndex: number;
		if (currentIndex === -1) {
			// Current file not in this tag, go to first note
			targetIndex = 0;
		} else {
			if (direction === 'next') {
				targetIndex = (currentIndex + 1) % notesForTag.length;
			} else {
				targetIndex = currentIndex === 0 ? notesForTag.length - 1 : currentIndex - 1;
			}
		}

		const targetFile = notesForTag[targetIndex].file;
		await this.app.workspace.getLeaf().openFile(targetFile);
		
		new Notice(`${direction === 'next' ? 'Next' : 'Previous'} in #${tag}: ${targetFile.basename}`);
	}

	async onClose() {
		// Nothing to clean up
	}
} 