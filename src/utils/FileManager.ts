import { App, TFile, TFolder } from 'obsidian';
import { TagOrderData, NoteData } from '../types';

export class FileManager {
    private app: App;
    private navigatorFolderPath: string;

    constructor(app: App, navigatorFolderPath: string) {
        this.app = app;
        this.navigatorFolderPath = navigatorFolderPath;
    }

    /**
     * Ensure navigator folder exists
     */
    async ensureNavigatorFolder(): Promise<TFolder> {
        const folder = this.app.vault.getAbstractFileByPath(this.navigatorFolderPath);
        if (folder instanceof TFolder) {
            return folder;
        }
        
        return await this.app.vault.createFolder(this.navigatorFolderPath);
    }

    /**
     * Get tag order file path
     */
    getTagOrderFilePath(tag: string): string {
        const sanitizedTag = tag.replace(/[\\/:*?"<>|]/g, '-');
        return `${this.navigatorFolderPath}/tag-navigator-${sanitizedTag}.md`;
    }

    /**
     * Save tag order to MD file
     */
    async saveTagOrder(tagOrderData: TagOrderData, notes: NoteData[]): Promise<void> {
        await this.ensureNavigatorFolder();
        
        const filePath = this.getTagOrderFilePath(tagOrderData.tag);
        const content = this.generateTagOrderContent(tagOrderData, notes);
        
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);
        if (existingFile instanceof TFile) {
            await this.app.vault.modify(existingFile, content);
        } else {
            await this.app.vault.create(filePath, content);
        }
    }

    /**
     * Load tag order from MD file
     */
    async loadTagOrder(tag: string): Promise<TagOrderData | null> {
        const filePath = this.getTagOrderFilePath(tag);
        const file = this.app.vault.getAbstractFileByPath(filePath);
        
        if (!(file instanceof TFile)) {
            return null;
        }

        const content = await this.app.vault.read(file);
        return this.parseTagOrderContent(content, tag);
    }

    /**
     * Generate MD content for tag order
     */
    private generateTagOrderContent(tagOrderData: TagOrderData, notes: NoteData[]): string {
        const frontmatter = [
            '---',
            `tag: ${tagOrderData.tag}`,
            `sortOrder: ${tagOrderData.sortOrder}`,
            `created: ${new Date().toISOString()}`,
            `updated: ${new Date().toISOString()}`,
            '---',
            '',
            `# Tag Navigator: #${tagOrderData.tag}`,
            '',
            `Sort Order: ${tagOrderData.sortOrder}`,
            `Total Notes: ${notes.length}`,
            '',
            '## Navigation Order',
            ''
        ].join('\n');

        const notesList = notes.map((note, index) => {
            return `${index + 1}. [[${note.file.basename}]]`;
        }).join('\n');

        return frontmatter + notesList + '\n';
    }

    /**
     * Parse MD content to extract tag order
     */
    private parseTagOrderContent(content: string, tag: string): TagOrderData | null {
        try {
            // Extract frontmatter
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const frontmatterMatch = content.match(frontmatterRegex);
            
            if (!frontmatterMatch) {
                return null;
            }

            const frontmatterText = frontmatterMatch[1];
            const sortOrderMatch = frontmatterText.match(/sortOrder:\s*(.+)/);
            const sortOrder = sortOrderMatch ? sortOrderMatch[1].trim() as any : 'custom';

            // Extract note links
            const notesRegex = /^\d+\.\s*\[\[([^\]]+)\]\]/gm;
            const notes: string[] = [];
            let match;

            while ((match = notesRegex.exec(content)) !== null) {
                const noteName = match[1];
                // Try to find the actual file path
                const file = this.app.vault.getFiles().find(f => 
                    f.basename === noteName || f.path.includes(noteName)
                );
                if (file) {
                    notes.push(file.path);
                }
            }

            return {
                tag,
                sortOrder,
                notes
            };
        } catch (error) {
            console.error('Error parsing tag order file:', error);
            return null;
        }
    }

    /**
     * Get all tag order files
     */
    async getAllTagOrderFiles(): Promise<TFile[]> {
        const folder = this.app.vault.getAbstractFileByPath(this.navigatorFolderPath);
        if (!(folder instanceof TFolder)) {
            return [];
        }

        return folder.children.filter(file => 
            file instanceof TFile && 
            file.name.startsWith('tag-navigator-') && 
            file.extension === 'md'
        ) as TFile[];
    }

    /**
     * Delete tag order file
     */
    async deleteTagOrder(tag: string): Promise<void> {
        const filePath = this.getTagOrderFilePath(tag);
        const file = this.app.vault.getAbstractFileByPath(filePath);
        
        if (file instanceof TFile) {
            await this.app.vault.delete(file);
        }
    }
} 