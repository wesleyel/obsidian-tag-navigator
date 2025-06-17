import { ItemView, WorkspaceLeaf, Setting, Notice } from 'obsidian';
import { VIEW_TYPE_SETTINGS_PAGE, NoteData } from '../types';
import type TagNavigatorPlugin from '../../main';

export class SettingsPageView extends ItemView {
	plugin: TagNavigatorPlugin;
	selectedTag: string | null = null;
	currentNotes: NoteData[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: TagNavigatorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_SETTINGS_PAGE;
	}

	getDisplayText() {
		return "Tag Navigator Settings";
	}

	getIcon() {
		return "settings";
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
		headerEl.createEl('h2', { text: 'Tag Navigator Settings' });

		// Main settings
		this.renderMainSettings(contentEl);

		// Two-column layout container
		const layoutEl = contentEl.createEl('div', { cls: 'settings-layout' });
		
		// Left sidebar - Tag list
		const leftPanel = layoutEl.createEl('div', { cls: 'settings-left-panel' });
		this.renderTagList(leftPanel);

		// Right panel - Note ordering
		const rightPanel = layoutEl.createEl('div', { cls: 'settings-right-panel' });
		await this.renderNoteOrdering(rightPanel);
	}

	renderMainSettings(container: Element) {
		const settingsContainer = container.createEl('div', { cls: 'main-settings' });

		new Setting(settingsContainer)
			.setName('Default Sort Order')
			.setDesc('Choose how notes should be sorted by default')
			.addDropdown(dropdown => dropdown
				.addOption('title', 'Title')
				.addOption('modified', 'Last Modified')
				.addOption('created', 'Created Date')
				.addOption('custom', 'Custom Order')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as any;
					await this.plugin.saveSettings();
				}));

		new Setting(settingsContainer)
			.setName('Show Toast Messages')
			.setDesc('Show notification messages when navigating between notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showToastMessages)
				.onChange(async (value) => {
					this.plugin.settings.showToastMessages = value;
					await this.plugin.saveSettings();
				}));
	}

	renderTagList(container: Element) {
		container.empty();
		
		const headerEl = container.createEl('div', { cls: 'panel-header' });
		headerEl.createEl('h3', { text: 'Tags' });

		const tags = this.plugin.getAllTags();
		
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
				this.selectedTag = tag;
				this.renderTagList(container);
				await this.renderNoteOrdering(container.parentElement!.querySelector('.settings-right-panel')!);
			};
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
				// Only re-render the current panels, not the entire page
				this.renderTagList(this.containerEl.querySelector('.settings-left-panel')!);
				await this.renderNoteOrdering(this.containerEl.querySelector('.settings-right-panel')!);
			};
		}
	}

	async getSortedNotes(): Promise<NoteData[]> {
		if (!this.selectedTag) return [];
		
		const notes = [...this.currentNotes];
		
		// If custom order exists, use it
		if (this.plugin.settings.customOrder[this.selectedTag]) {
			const customOrder = this.plugin.settings.customOrder[this.selectedTag];
			return notes.sort((a, b) => {
				const aIndex = customOrder.indexOf(a.file.path);
				const bIndex = customOrder.indexOf(b.file.path);
				if (aIndex === -1 && bIndex === -1) return 0;
				if (aIndex === -1) return 1;
				if (bIndex === -1) return -1;
				return aIndex - bIndex;
			});
		}

		// Default sort by title
		return notes.sort((a, b) => a.title.localeCompare(b.title));
	}

	async sortByModified() {
		if (!this.selectedTag) return;
		
		const notes = [...this.currentNotes];
		notes.sort((a, b) => b.file.stat.mtime - a.file.stat.mtime);
		
		// Save as custom order
		this.plugin.settings.customOrder[this.selectedTag] = notes.map(note => note.file.path);
		await this.plugin.saveSettings();
		
		new Notice('Sorted by modified time');
		// Only re-render the affected panels
		this.renderTagList(this.containerEl.querySelector('.settings-left-panel')!);
		await this.renderNoteOrdering(this.containerEl.querySelector('.settings-right-panel')!);
	}

	async sortByName() {
		if (!this.selectedTag) return;
		
		const notes = [...this.currentNotes];
		notes.sort((a, b) => a.title.localeCompare(b.title));
		
		// Save as custom order
		this.plugin.settings.customOrder[this.selectedTag] = notes.map(note => note.file.path);
		await this.plugin.saveSettings();
		
		new Notice('Sorted by name');
		// Only re-render the affected panels
		this.renderTagList(this.containerEl.querySelector('.settings-left-panel')!);
		await this.renderNoteOrdering(this.containerEl.querySelector('.settings-right-panel')!);
	}

	async saveCurrentOrder() {
		if (!this.selectedTag) return;
		
		const noteElements = this.containerEl.querySelectorAll('.note-item');
		const customOrder = Array.from(noteElements).map(el => (el as HTMLElement).dataset.path!);
		
		this.plugin.settings.customOrder[this.selectedTag] = customOrder;
		await this.plugin.saveSettings();
		
		new Notice('Custom order saved');
		// Only re-render the left panel to show the custom order indicator
		this.renderTagList(this.containerEl.querySelector('.settings-left-panel')!);
	}

	addDragHandlers(element: HTMLElement, container: HTMLElement) {
		element.ondragstart = (e) => {
			e.dataTransfer!.setData('text/plain', element.dataset.path!);
			element.classList.add('dragging');
		};

		element.ondragend = () => {
			element.classList.remove('dragging');
		};

		element.ondragover = (e) => {
			e.preventDefault();
			const rect = element.getBoundingClientRect();
			const midpoint = rect.top + rect.height / 2;
			
			if (e.clientY < midpoint) {
				element.classList.add('drag-over-top');
				element.classList.remove('drag-over-bottom');
			} else {
				element.classList.add('drag-over-bottom');
				element.classList.remove('drag-over-top');
			}
		};

		element.ondragleave = () => {
			element.classList.remove('drag-over-top', 'drag-over-bottom');
		};

		element.ondrop = (e) => {
			e.preventDefault();
			element.classList.remove('drag-over-top', 'drag-over-bottom');
			
			const draggedPath = e.dataTransfer!.getData('text/plain');
			const draggedElement = container.querySelector(`[data-path="${draggedPath}"]`) as HTMLElement;
			
			if (draggedElement && draggedElement !== element) {
				const rect = element.getBoundingClientRect();
				const midpoint = rect.top + rect.height / 2;
				
				if (e.clientY < midpoint) {
					container.insertBefore(draggedElement, element);
				} else {
					container.insertBefore(draggedElement, element.nextSibling);
				}
			}
		};
	}

	async onClose() {
		// Clean up
	}
} 