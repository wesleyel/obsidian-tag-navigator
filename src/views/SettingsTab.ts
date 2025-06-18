import { App, PluginSettingTab, Setting } from 'obsidian';
import type TagNavigatorPlugin from '../../main';

export class TagNavigatorSettingTab extends PluginSettingTab {
	plugin: TagNavigatorPlugin;

	constructor(app: App, plugin: TagNavigatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Tag Navigator Settings' });

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

		new Setting(containerEl)
			.setName('Show Toast Messages')
			.setDesc('Show notification messages when navigating between notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showToastMessages)
				.onChange(async (value) => {
					this.plugin.settings.showToastMessages = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Export Folder Path')
			.setDesc('Folder where exported tag notes will be saved')
			.addText(text => text
				.setPlaceholder('tag-exports')
				.setValue(this.plugin.settings.exportFolderPath)
				.onChange(async (value) => {
					this.plugin.settings.exportFolderPath = value || 'tag-exports';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Export File Name Format')
			.setDesc('Format for exported file names. Use {tag} as placeholder for the tag name.')
			.addText(text => text
				.setPlaceholder('tag-{tag}.md')
				.setValue(this.plugin.settings.exportFileNameFormat)
				.onChange(async (value) => {
					this.plugin.settings.exportFileNameFormat = value || 'tag-{tag}.md';
					await this.plugin.saveSettings();
				}));
	}
} 