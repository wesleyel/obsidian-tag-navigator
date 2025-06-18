import { Notice } from 'obsidian';
import { NoteData } from '../types';
import { NoteUtils } from './noteUtils';
import { SortUtils } from './sortUtils';

export class NavigationUtils {
	/**
	 * Navigate to next note in tag sequence
	 */
	static async navigateToNext(
		app: any,
		showToastMessages: boolean,
		sortOrder: string,
		customOrder: Record<string, string[]>
	): Promise<void> {
		const currentFile = NoteUtils.getCurrentNote(app);
		if (!currentFile) {
			if (showToastMessages) {
				new Notice('No active note');
			}
			return;
		}

		const currentNoteData = NoteUtils.getAllNotesWithTags(app).find(note => note.file.path === currentFile.path);
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			if (showToastMessages) {
				new Notice('Current note has no tags');
			}
			return;
		}

		// Use the first tag for navigation
		const tag = currentNoteData.tags[0];
		const notesForTag = await SortUtils.sortNotes(NoteUtils.getNotesForTag(app, tag), tag, sortOrder, customOrder);
		
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		if (currentIndex === -1) return;

		const nextIndex = (currentIndex + 1) % notesForTag.length;
		const nextFile = notesForTag[nextIndex].file;

		await app.workspace.getLeaf().openFile(nextFile);
		
		if (showToastMessages) {
			new Notice(`Next: ${nextFile.basename}`);
		}
	}

	/**
	 * Navigate to previous note in tag sequence
	 */
	static async navigateToPrev(
		app: any,
		showToastMessages: boolean,
		sortOrder: string,
		customOrder: Record<string, string[]>
	): Promise<void> {
		const currentFile = NoteUtils.getCurrentNote(app);
		if (!currentFile) {
			if (showToastMessages) {
				new Notice('No active note');
			}
			return;
		}

		const currentNoteData = NoteUtils.getAllNotesWithTags(app).find(note => note.file.path === currentFile.path);
		if (!currentNoteData || currentNoteData.tags.length === 0) {
			if (showToastMessages) {
				new Notice('Current note has no tags');
			}
			return;
		}

		// Use the first tag for navigation
		const tag = currentNoteData.tags[0];
		const notesForTag = await SortUtils.sortNotes(NoteUtils.getNotesForTag(app, tag), tag, sortOrder, customOrder);
		
		const currentIndex = notesForTag.findIndex(note => note.file.path === currentFile.path);
		if (currentIndex === -1) return;

		const prevIndex = currentIndex === 0 ? notesForTag.length - 1 : currentIndex - 1;
		const prevFile = notesForTag[prevIndex].file;

		await app.workspace.getLeaf().openFile(prevFile);
		
		if (showToastMessages) {
			new Notice(`Previous: ${prevFile.basename}`);
		}
	}
} 