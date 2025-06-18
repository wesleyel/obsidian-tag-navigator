import { ItemView, WorkspaceLeaf, Setting, Notice } from 'obsidian';
import { VIEW_TYPE_SETTINGS_PAGE, NoteData } from '../types';
import type TagNavigatorPlugin from '../../main';

type TagSortMode = 'name' | 'count' | 'custom';

export class SettingsPageView extends ItemView {
	plugin: TagNavigatorPlugin;
	selectedTag: string | null = null;
	currentNotes: NoteData[] = [];
	tagSortMode: TagSortMode = 'name';
	private isRendering: boolean = false;
	private draggedElement: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TagNavigatorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_SETTINGS_PAGE;
	}

	getDisplayText() {
		return "Tag Navigator - Tag Ordering";
	}

	getIcon() {
		return "sliders-horizontal";
	}

	async onOpen() {
		await this.render();
	}

	async render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tag-navigator-settings-page');

		// Page header
		const headerEl = contentEl.createEl('div', { cls: 'settings-page-header' });
		headerEl.createEl('h2', { text: 'Tag Navigator - Tag Ordering' });

		// Export All Tags section
		this.renderExportSection(contentEl);

		// Two-column layout container
		const layoutEl = contentEl.createEl('div', { cls: 'settings-layout' });
		
		// Left sidebar - Tag list
		const leftPanel = layoutEl.createEl('div', { cls: 'settings-left-panel' });
		this.renderTagList(leftPanel);

		// Right panel - Note ordering
		const rightPanel = layoutEl.createEl('div', { cls: 'settings-right-panel' });
		await this.renderNoteOrdering(rightPanel);
	}

	renderExportSection(container: Element) {
		const exportSection = container.createEl('div', { cls: 'export-section' });
		exportSection.createEl('h3', { text: 'Export Functions' });
		exportSection.createEl('p', { 
			text: 'Export tags as numbered list notes in the specified folder',
			cls: 'setting-item-description'
		});

		const exportButtons = exportSection.createEl('div', { cls: 'export-buttons' });
		
		const exportAllBtn = exportButtons.createEl('button', { 
			text: 'Export All Tags',
			cls: 'mod-cta'
		});
		exportAllBtn.onclick = async () => {
			exportAllBtn.disabled = true;
			exportAllBtn.textContent = 'Exporting...';
			
			try {
				await this.plugin.exportAllTags();
			} finally {
				exportAllBtn.disabled = false;
				exportAllBtn.textContent = 'Export All Tags';
			}
		};
	}

	renderTagList(container: Element) {
		if (this.isRendering) {
			return; // Prevent recursive rendering
		}
		
		this.isRendering = true;
		container.empty();
		
		const headerEl = container.createEl('div', { cls: 'panel-header' });
		headerEl.createEl('h3', { text: 'Tags' });

		// Tag sort controls
		const sortControlsEl = container.createEl('div', { cls: 'tag-sort-controls' });
		
		const sortByNameBtn = sortControlsEl.createEl('button', { 
			text: 'Name',
			cls: this.tagSortMode === 'name' ? 'mod-cta' : ''
		});
		sortByNameBtn.onclick = () => {
			if (this.tagSortMode !== 'name') {
				this.tagSortMode = 'name';
				this.isRendering = false; // Reset before re-render
				this.renderTagList(container);
			}
		};

		const sortByCountBtn = sortControlsEl.createEl('button', { 
			text: 'Count',
			cls: this.tagSortMode === 'count' ? 'mod-cta' : ''
		});
		sortByCountBtn.onclick = () => {
			if (this.tagSortMode !== 'count') {
				this.tagSortMode = 'count';
				this.isRendering = false; // Reset before re-render
				this.renderTagList(container);
			}
		};

		const sortByCustomBtn = sortControlsEl.createEl('button', { 
			text: 'Custom',
			cls: this.tagSortMode === 'custom' ? 'mod-cta' : ''
		});
		sortByCustomBtn.onclick = () => {
			if (this.tagSortMode !== 'custom') {
				this.tagSortMode = 'custom';
				this.isRendering = false; // Reset before re-render
				this.renderTagList(container);
			}
		};

		const tags = this.getSortedTags();
		
		if (tags.length === 0) {
			container.createEl('p', { text: 'No tags found', cls: 'empty-state' });
			return;
		}

		const tagListEl = container.createEl('div', { cls: 'tag-list' });

		for (const tag of tags) {
			const tagItem = tagListEl.createEl('div', { 
				cls: 'tag-item',
				text: `#${tag}`
			});

			if (tag === this.selectedTag) {
				tagItem.addClass('selected');
			}

			// Show custom order indicator
			if (this.plugin.settings.customOrder[tag]) {
				tagItem.createEl('span', { 
					text: '⚙️', 
					cls: 'custom-order-indicator',
					attr: { title: 'Has custom order' }
				});
			}

			// Show note count
			const noteCount = this.plugin.getNotesForTag(tag).length;
			tagItem.createEl('span', { 
				text: `(${noteCount})`, 
				cls: 'tag-count' 
			});

			tagItem.onclick = async () => {
				if (this.selectedTag !== tag) {
					this.selectedTag = tag;
					this.isRendering = false; // Reset before re-render
					this.renderTagList(container);
					await this.renderNoteOrdering(container.parentElement!.querySelector('.settings-right-panel')!);
				}
			};
		}
		
		this.isRendering = false;
	}

	getSortedTags(): string[] {
		const tags = this.plugin.getAllTags();
		
		switch (this.tagSortMode) {
			case 'name':
				return tags.sort();
			case 'count':
				return tags.sort((a, b) => {
					const countA = this.plugin.getNotesForTag(a).length;
					const countB = this.plugin.getNotesForTag(b).length;
					return countB - countA; // Descending order
				});
			case 'custom':
				return tags.sort((a, b) => {
					const hasCustomA = !!this.plugin.settings.customOrder[a];
					const hasCustomB = !!this.plugin.settings.customOrder[b];
					if (hasCustomA && !hasCustomB) return -1;
					if (!hasCustomA && hasCustomB) return 1;
					return a.localeCompare(b);
				});
			default:
				return tags;
		}
	}

	async renderNoteOrdering(container: Element) {
		container.empty();

		if (!this.selectedTag) {
			container.createEl('div', { 
				cls: 'empty-state',
				text: 'Select a tag to configure note ordering'
			});
			return;
		}

		const headerEl = container.createEl('div', { cls: 'panel-header' });
		headerEl.createEl('h3', { text: `Notes in #${this.selectedTag}` });

		// Action buttons
		const actionsEl = container.createEl('div', { cls: 'ordering-actions' });
		
		const sortByModifiedBtn = actionsEl.createEl('button', { 
			text: 'Sort by Modified Time',
			cls: 'mod-cta'
		});
		sortByModifiedBtn.onclick = async () => {
			await this.sortByModified();
		};

		const sortByNameBtn = actionsEl.createEl('button', { 
			text: 'Sort by Name',
			cls: 'mod-cta'
		});
		sortByNameBtn.onclick = async () => {
			await this.sortByName();
		};

		// Export button for current tag
		const exportBtn = actionsEl.createEl('button', { 
			text: `Export #${this.selectedTag}`,
			cls: 'mod-warning'
		});
		exportBtn.onclick = async () => {
			exportBtn.disabled = true;
			exportBtn.textContent = 'Exporting...';
			
			try {
				await this.plugin.exportSingleTag(this.selectedTag!);
			} finally {
				exportBtn.disabled = false;
				exportBtn.textContent = `Export #${this.selectedTag}`;
			}
		};

		// Notes list
		this.currentNotes = this.plugin.getNotesForTag(this.selectedTag);
		const sortedNotes = await this.getSortedNotes();

		const notesListEl = container.createEl('div', { cls: 'sortable-notes-list' });
		
		for (let i = 0; i < sortedNotes.length; i++) {
			const note = sortedNotes[i];
			const noteEl = notesListEl.createEl('div', { cls: 'note-item' });
			noteEl.draggable = true;
			noteEl.dataset.path = note.file.path;

			// Drag handle
			noteEl.createEl('span', { cls: 'drag-handle', text: '⋮⋮' });

			// Note title
			const titleEl = noteEl.createEl('span', { cls: 'note-title', text: note.title });
			
			// Note info
			const infoEl = noteEl.createEl('div', { cls: 'note-info' });
			const modifiedDate = new Date(note.file.stat.mtime).toLocaleDateString();
			infoEl.createEl('span', { text: `Modified: ${modifiedDate}`, cls: 'note-date' });

			// Click to open
			titleEl.onclick = async () => {
				await this.app.workspace.getLeaf().openFile(note.file);
			};

			// Add drag and drop handlers
			this.addDragHandlers(noteEl, notesListEl);
		}

		// Save button
		const saveBtn = container.createEl('button', { 
			text: 'Save Custom Order',
			cls: 'mod-cta save-order-btn'
		});
		saveBtn.onclick = async () => {
			await this.saveCurrentOrder();
		};

		// Clear custom order button if exists
		if (this.plugin.settings.customOrder[this.selectedTag]) {
			const clearBtn = container.createEl('button', { 
				text: 'Clear Custom Order',
				cls: 'mod-warning'
			});
			clearBtn.onclick = async () => {
				delete this.plugin.settings.customOrder[this.selectedTag!];
				await this.plugin.saveSettings();
				new Notice('Custom order cleared');
				
				// Only re-render the left panel to update indicators
				const leftPanel = this.containerEl.querySelector('.settings-left-panel');
				if (leftPanel) {
					this.isRendering = false; // Reset before re-render
					this.renderTagList(leftPanel);
				}
				// Re-render right panel without the clear button
				await this.renderNoteOrdering(container);
			};
		}
	}

	async getSortedNotes(): Promise<NoteData[]> {
		if (!this.selectedTag) return [];
		
		const notes = [...this.currentNotes];
		return await this.plugin.sortNotes(notes, this.selectedTag);
	}

	async sortByModified() {
		if (!this.selectedTag) return;
		
		const notes = [...this.currentNotes];
		const sortedNotes = notes.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
		
		await this.saveCustomOrder(sortedNotes);
		new Notice('Sorted by modified time');
	}

	async sortByName() {
		if (!this.selectedTag) return;
		
		const notes = [...this.currentNotes];
		const sortedNotes = notes.sort((a, b) => a.title.localeCompare(b.title));
		
		await this.saveCustomOrder(sortedNotes);
		new Notice('Sorted by name');
	}

	async saveCustomOrder(sortedNotes?: NoteData[]) {
		if (!this.selectedTag) return;
		
		const notesToSave = sortedNotes || this.getCurrentOrderFromDOM();
		const filePaths = notesToSave.map(note => note.file.path);
		
		await this.plugin.saveCustomOrder(this.selectedTag, filePaths);
		
		// Only re-render if we provided sorted notes (manual sort)
		if (sortedNotes) {
			// Only re-render the tag list to update indicators
			const leftPanel = this.containerEl.querySelector('.settings-left-panel');
			if (leftPanel) {
				this.isRendering = false; // Reset before re-render
				this.renderTagList(leftPanel);
			}
			
			// Re-render right panel to show updated order
			const rightPanel = this.containerEl.querySelector('.settings-right-panel');
			if (rightPanel) {
				await this.renderNoteOrdering(rightPanel);
			}
		}
	}

	getCurrentOrderFromDOM(): NoteData[] {
		const noteElements = this.containerEl.querySelectorAll('.note-item');
		const orderedNotes: NoteData[] = [];
		
		noteElements.forEach(el => {
			const path = (el as HTMLElement).dataset.path;
			const note = this.currentNotes.find(n => n.file.path === path);
			if (note) {
				orderedNotes.push(note);
			}
		});
		
		return orderedNotes;
	}

	async saveCurrentOrder() {
		if (!this.selectedTag) return;
		
		const orderedNotes = this.getCurrentOrderFromDOM();
		const filePaths = orderedNotes.map(note => note.file.path);
		
		this.plugin.settings.customOrder[this.selectedTag] = filePaths;
		await this.plugin.saveSettings();
		
		new Notice('Custom order saved');
		// Only re-render the left panel to show the custom order indicator
		const leftPanel = this.containerEl.querySelector('.settings-left-panel');
		if (leftPanel) {
			this.isRendering = false; // Reset before re-render
			this.renderTagList(leftPanel);
		}
	}

	addDragHandlers(element: HTMLElement, container: HTMLElement) {
		element.addEventListener('dragstart', (e) => {
			this.draggedElement = element;
			element.style.opacity = '0.5';
			element.classList.add('dragging');
		});

		element.addEventListener('dragend', (e) => {
			element.style.opacity = '1';
			element.classList.remove('dragging');
			this.draggedElement = null;
			
			// Note: Don't auto-save here to avoid re-rendering issues
			// User can manually save or we save when they leave the page
		});

		element.addEventListener('dragover', (e) => {
			e.preventDefault();
			const rect = element.getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			
			// Visual feedback
			element.classList.remove('drag-over-top', 'drag-over-bottom');
			if (e.clientY < midY) {
				element.classList.add('drag-over-top');
			} else {
				element.classList.add('drag-over-bottom');
			}
		});

		element.addEventListener('dragleave', (e) => {
			element.classList.remove('drag-over-top', 'drag-over-bottom');
		});

		element.addEventListener('drop', (e) => {
			e.preventDefault();
			element.classList.remove('drag-over-top', 'drag-over-bottom');
			
			if (this.draggedElement && this.draggedElement !== element) {
				const rect = element.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				
				if (e.clientY < midY) {
					container.insertBefore(this.draggedElement, element);
				} else {
					container.insertBefore(this.draggedElement, element.nextSibling);
				}
				
				// Show indication that order changed but don't auto-save
				new Notice('Drag completed - remember to save your changes');
			}
		});
	}

	async onClose() {
		// Clean up if needed
	}
} 