import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, TFile, getAllTags } from 'obsidian';

// Remember to rename these classes and interfaces!

interface TagNavigatorSettings {
	sortOrder: 'title' | 'modified' | 'created' | 'custom';
	customOrder: Record<string, string[]>; // tag -> ordered file paths
}

const DEFAULT_SETTINGS: TagNavigatorSettings = {
	sortOrder: 'title',
	customOrder: {}
}

interface NoteData {
	file: TFile;
	tags: string[];
	frontmatter: any;
	title: string;
}

export default class TagNavigatorPlugin extends Plugin {
	settings: TagNavigatorSettings;

	async onload() {
		await this.loadSettings();

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

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NAVIGATOR_PANEL);
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

	sortNotes(notes: NoteData[], tag: string): NoteData[] {
		if (this.settings.sortOrder === 'custom' && this.settings.customOrder[tag]) {
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

	async saveCustomOrder(tag: string, filePaths: string[]) {
		this.settings.customOrder[tag] = filePaths;
		await this.saveSettings();
	}

	getCurrentNote(): TFile | null {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return activeView?.file || null;
	}

	async navigateToNext() {
		const currentFile = this.getCurrentNote();
		if (!currentFile) {
			new Notice('No active note');
			return;
		}

		const currentNoteData = this.getAllNotesWithTags().find(note => note.file.path === currentFile.path);
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			new Notice('Current note has no tags');
			return;
		}

		// Use the first tag for navigation
		const tag = currentNoteData.tags[0];
		const notesForTag = this.sortNotes(this.getNotesForTag(tag), tag);
		
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		if (currentIndex === -1) return;

		const nextIndex = (currentIndex + 1) % notesForTag.length;
		const nextFile = notesForTag[nextIndex].file;

		await this.app.workspace.getLeaf().openFile(nextFile);
		new Notice(`Next: ${nextFile.basename}`);
	}

	async navigateToPrev() {
		const currentFile = this.getCurrentNote();
		if (!currentFile) {
			new Notice('No active note');
			return;
		}

		const currentNoteData = this.getAllNotesWithTags().find(note => note.file.path === currentFile.path);
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			new Notice('Current note has no tags');
			return;
		}

		// Use the first tag for navigation
		const tag = currentNoteData.tags[0];
		const notesForTag = this.sortNotes(this.getNotesForTag(tag), tag);
		
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		if (currentIndex === -1) return;

		const prevIndex = currentIndex === 0 ? notesForTag.length - 1 : currentIndex - 1;
		const prevFile = notesForTag[prevIndex].file;

		await this.app.workspace.getLeaf().openFile(prevFile);
		new Notice(`Previous: ${prevFile.basename}`);
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

const VIEW_TYPE_NAVIGATOR_PANEL = "navigator-panel";

class NavigatorPanelView extends ItemView {
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

		// Refresh when files change
		this.registerEvent(
			this.app.vault.on('modify', () => {
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

	renderTagList(container: Element) {
		const tags = this.plugin.getAllTags();
		
		if (tags.length === 0) {
			container.createEl("p", { text: "No tags found" });
			return;
		}

		for (const tag of tags) {
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

			// Show notes count
			const notesCount = this.plugin.getNotesForTag(tag).length;
			tagContainer.createEl("span", { text: `(${notesCount} notes)`, cls: "tag-navigator-count" });
		}
	}

	async navigateInTag(tag: string, direction: 'next' | 'prev') {
		const currentFile = this.plugin.getCurrentNote();
		if (!currentFile) {
			new Notice('No active note');
			return;
		}

		const notesForTag = this.plugin.sortNotes(this.plugin.getNotesForTag(tag), tag);
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

class ManualNavigationModal extends Modal {
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
			const option = tagSelect.createEl("option", { text: `#${tag}`, value: tag });
		}

		tagSelect.onchange = () => {
			if (tagSelect.value) {
				this.selectedTag = tagSelect.value;
				this.renderNotesList(container);
			}
		};
	}

	renderNotesList(container: Element) {
		if (!this.selectedTag) return;

		// Remove existing notes list
		const existingList = container.querySelector('.notes-list');
		if (existingList) {
			existingList.remove();
		}

		const notesContainer = container.createEl("div", { cls: "notes-list" });
		notesContainer.createEl("h3", { text: `Notes with #${this.selectedTag}` });

		const notes = this.plugin.getNotesForTag(this.selectedTag);
		const sortedNotes = this.plugin.sortNotes([...notes], this.selectedTag);

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

class TagNavigatorSettingTab extends PluginSettingTab {
	plugin: TagNavigatorPlugin;

	constructor(app: App, plugin: TagNavigatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
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

		// Display saved custom orders
		if (Object.keys(this.plugin.settings.customOrder).length > 0) {
			containerEl.createEl('h3', { text: 'Saved Custom Orders' });
			
			for (const [tag, order] of Object.entries(this.plugin.settings.customOrder)) {
				const tagSetting = new Setting(containerEl)
					.setName(`#${tag}`)
					.setDesc(`${order.length} notes in custom order`);

				tagSetting.addButton(button => button
					.setButtonText('Clear')
					.onClick(async () => {
						delete this.plugin.settings.customOrder[tag];
						await this.plugin.saveSettings();
						this.display();
					}));
			}
		}
	}
}
