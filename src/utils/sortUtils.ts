import { NoteData } from '../types';

export class SortUtils {
	/**
	 * Sort notes based on settings and custom order
	 */
	static async sortNotes(
		notes: NoteData[], 
		tag: string, 
		sortOrder: string, 
		customOrder: Record<string, string[]>
	): Promise<NoteData[]> {
		// Always check for custom order first, regardless of sortOrder setting
		if (customOrder[tag] && customOrder[tag].length > 0) {
			const tagCustomOrder = customOrder[tag];
			return notes.sort((a, b) => {
				const aIndex = tagCustomOrder.indexOf(a.file.path);
				const bIndex = tagCustomOrder.indexOf(b.file.path);
				if (aIndex === -1 && bIndex === -1) return 0;
				if (aIndex === -1) return 1;
				if (bIndex === -1) return -1;
				return aIndex - bIndex;
			});
		}

		// If no custom order, use the sortOrder setting
		switch (sortOrder) {
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

	/**
	 * Get sort order description for display
	 */
	static getSortOrderDescription(tag: string, sortOrder: string, customOrder: Record<string, string[]>): string {
		// Always check for custom order first, regardless of sortOrder setting
		if (customOrder[tag] && customOrder[tag].length > 0) {
			return 'Custom Order';
		}
		
		switch (sortOrder) {
			case 'title':
				return 'Alphabetical (Title)';
			case 'modified':
				return 'Last Modified';
			case 'created':
				return 'Created Date';
			case 'custom':
				return 'Default Order';
			default:
				return 'Unknown';
		}
	}
} 