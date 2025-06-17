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
			.setName('Navigator Folder Path')
			.setDesc('Folder path where tag navigator files will be saved')
			.addText(text => text
				.setPlaceholder('navigator')
				.setValue(this.plugin.settings.navigatorFolderPath)
				.onChange(async (value) => {
					this.plugin.settings.navigatorFolderPath = value || 'navigator';
					await this.plugin.saveSettings();
				}));

		// Display saved custom orders
		this.displayCustomOrders(containerEl);
	}

	async displayCustomOrders(containerEl: HTMLElement) {
		const customOrderFiles = await this.plugin.fileManager.getAllTagOrderFiles();
		
		if (customOrderFiles.length > 0) {
			containerEl.createEl('h3', { text: 'Saved Custom Orders' });
			
			for (const file of customOrderFiles) {
				const tagMatch = file.name.match(/tag-navigator-(.+)\.md/);
				const tag = tagMatch ? tagMatch[1].replace(/-/g, '/') : file.basename;
				
				const tagSetting = new Setting(containerEl)
					.setName(`#${tag}`)
					.setDesc(`Custom order saved in ${file.path}`);

				tagSetting.addButton(button => button
					.setButtonText('View File')
					.onClick(async () => {
						await this.app.workspace.getLeaf().openFile(file);
					}));

				tagSetting.addButton(button => button
					.setButtonText('Delete')
					.setWarning()
					.onClick(async () => {
						await this.plugin.fileManager.deleteTagOrder(tag);
						this.display();
					}));
			}
		}
	}
} 