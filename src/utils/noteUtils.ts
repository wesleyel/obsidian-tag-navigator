import { TFile, getAllTags, MarkdownView } from 'obsidian';
import { NoteData } from '../types';

export class NoteUtils {
	/**
	 * Get all notes that have tags
	 */
	static getAllNotesWithTags(app: any): NoteData[] {
		const files = app.vault.getMarkdownFiles();
		const notesData: NoteData[] = [];

		for (const file of files) {
			const cache = app.metadataCache.getFileCache(file);
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

	/**
	 * Get notes for a specific tag
	 */
	static getNotesForTag(app: any, tag: string): NoteData[] {
		const allNotes = this.getAllNotesWithTags(app);
		return allNotes.filter(note => note.tags.includes(tag));
	}

	/**
	 * Get all unique tags from all notes
	 */
	static getAllTags(app: any): string[] {
		const tags = new Set<string>();
		const allNotes = this.getAllNotesWithTags(app);
		
		for (const note of allNotes) {
			for (const tag of note.tags) {
				tags.add(tag);
			}
		}

		return Array.from(tags).sort();
	}

	/**
	 * Get current active note
	 */
	static getCurrentNote(app: any): TFile | null {
		// First try to get the active markdown view
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView?.file) {
			return activeView.file;
		}

		// If no active markdown view, try to get the most recently active leaf with a file
		const activeLeaf = app.workspace.getMostRecentLeaf();
		if (activeLeaf?.view instanceof MarkdownView && activeLeaf.view.file) {
			return activeLeaf.view.file;
		}

		// Last resort: get any open markdown file
		const markdownLeaves = app.workspace.getLeavesOfType('markdown');
		for (const leaf of markdownLeaves) {
			if (leaf.view instanceof MarkdownView && leaf.view.file) {
				return leaf.view.file;
			}
		}

		return null;
	}

	/**
	 * Sanitize file name for export
	 */
	static sanitizeFileName(tag: string): string {
		// Remove invalid characters for file names
		return tag.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
	}
} 