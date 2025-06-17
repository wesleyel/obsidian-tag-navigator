import { App, Modal, Notice } from 'obsidian';
import { NoteData } from '../types';
import type TagNavigatorPlugin from '../../main';

export class ManualNavigationModal extends Modal {
	plugin: TagNavigatorPlugin;
	selectedTag: string | null = null;

	constructor(app: App, plugin: TagNavigatorPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Manual Navigation Panel" });

		this.renderTagSelection(contentEl);
	}

	renderTagSelection(container: Element) {
		const tags = this.plugin.getAllTags();
		
		if (tags.length === 0) {
			container.createEl("p", { text: "No tags found" });
			return;
		}

		const tagSelect = container.createEl("select");
		tagSelect.createEl("option", { text: "Select a tag...", value: "" });
		
		for (const tag of tags) {
			tagSelect.createEl("option", { text: `#${tag}`, value: tag });
		}

		tagSelect.onchange = () => {
			if (tagSelect.value) {
				this.selectedTag = tagSelect.value;
				this.renderNotesList(container);
			}
		};
	}

	async renderNotesList(container: Element) {
		if (!this.selectedTag) return;

		// Remove existing notes list
		const existingList = container.querySelector('.notes-list');
		if (existingList) {
			existingList.remove();
		}

		const notesContainer = container.createEl("div", { cls: "notes-list" });
		notesContainer.createEl("h3", { text: `Notes with #${this.selectedTag}` });

		const notes = this.plugin.getNotesForTag(this.selectedTag);
		const sortedNotes = await this.plugin.sortNotes([...notes], this.selectedTag);

		// Sort options
		const sortContainer = notesContainer.createEl("div", { cls: "sort-options" });
		const sortSelect = sortContainer.createEl("select");
		
		const sortOptions = [
			{ value: 'title', text: 'Sort by Title' },
			{ value: 'modified', text: 'Sort by Modified' },
			{ value: 'created', text: 'Sort by Created' },
			{ value: 'custom', text: 'Custom Order' }
		];

		for (const option of sortOptions) {
			const optionEl = sortSelect.createEl("option", { text: option.text, value: option.value });
			if (option.value === this.plugin.settings.sortOrder) {
				optionEl.selected = true;
			}
		}

		sortSelect.onchange = async () => {
			this.plugin.settings.sortOrder = sortSelect.value as any;
			await this.plugin.saveSettings();
			this.renderNotesList(container);
		};

		// Notes list with drag and drop for custom sorting
		const notesList = notesContainer.createEl("div", { cls: "sortable-notes-list" });
		
		for (let i = 0; i < sortedNotes.length; i++) {
			const note = sortedNotes[i];
			const noteEl = notesList.createEl("div", { cls: "note-item" });
			noteEl.draggable = true;
			noteEl.dataset.path = note.file.path;

			const titleSpan = noteEl.createEl("span", { text: note.title });
			titleSpan.onclick = async () => {
				await this.app.workspace.getLeaf().openFile(note.file);
				this.close();
			};

			// Add drag and drop handlers for custom sorting
			if (this.plugin.settings.sortOrder === 'custom') {
				this.addDragHandlers(noteEl, notesList);
			}
		}

		// Save custom order button
		if (this.plugin.settings.sortOrder === 'custom') {
			const saveButton = notesContainer.createEl("button", { text: "Save Custom Order" });
			saveButton.onclick = async () => {
				const noteElements = notesList.querySelectorAll('.note-item');
				const customOrder = Array.from(noteElements).map(el => (el as HTMLElement).dataset.path!);
				
				await this.plugin.saveCustomOrder(this.selectedTag!, customOrder);
				new Notice('Custom order saved');
			};
		}
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
		};

		element.ondrop = (e) => {
			e.preventDefault();
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

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
} 