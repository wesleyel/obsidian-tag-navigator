import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { NavigationUtils } from "../../../src/utils/navigationUtils";
import { NoteUtils } from "../../../src/utils/noteUtils";
import { SortUtils } from "../../../src/utils/sortUtils";
import { NoteData } from "../../../src/types";

// Mock dependencies
jest.mock("../../../src/utils/noteUtils");
jest.mock("../../../src/utils/sortUtils");
jest.mock("obsidian", () => ({
	Notice: jest.fn(),
}));

// Mock TFile class
class MockTFile {
	path: string;
	basename: string;
	name: string;
	extension: string;
	vault: any;
	parent: any;
	stat: any;

	constructor(path: string, basename?: string) {
		this.path = path;
		this.basename = basename || path.replace('.md', '').split('/').pop() || '';
		this.name = basename || this.basename;
		this.extension = 'md';
		this.vault = {};
		this.parent = null;
		this.stat = {
			ctime: Date.now(),
			mtime: Date.now(),
			size: 1000
		};
	}
}

const TFile = MockTFile;

// Cast the mocked functions to their proper types
const mockSortNotes = SortUtils.sortNotes as jest.MockedFunction<
	typeof SortUtils.sortNotes
>;
const mockGetCurrentNote = NoteUtils.getCurrentNote as jest.MockedFunction<
	typeof NoteUtils.getCurrentNote
>;
const mockGetAllNotesWithTags =
	NoteUtils.getAllNotesWithTags as jest.MockedFunction<
		typeof NoteUtils.getAllNotesWithTags
	>;
const mockGetNotesForTag = NoteUtils.getNotesForTag as jest.MockedFunction<
	typeof NoteUtils.getNotesForTag
>;

describe("NavigationUtils", () => {
	let mockApp: any;
	let mockCurrentFile: any;
	let mockNotes: NoteData[];
	let mockSortedNotes: NoteData[];

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock current file
		mockCurrentFile = new TFile("test1.md", "test1");

		// Mock notes
		mockNotes = [
			{
				file: new TFile("test1.md", "test1"),
				tags: ["research"],
				frontmatter: {},
				title: "test1",
			},
			{
				file: new TFile("test2.md", "test2"),
				tags: ["research"],
				frontmatter: {},
				title: "test2",
			},
			{
				file: new TFile("test3.md", "test3"),
				tags: ["research"],
				frontmatter: {},
				title: "test3",
			},
		] as NoteData[];

		mockSortedNotes = [...mockNotes];

		// Mock app
		mockApp = {
			workspace: {
				getLeaf: jest.fn().mockReturnValue({
					openFile: jest
						.fn()
						.mockImplementation(() => Promise.resolve(undefined)),
				}),
			},
		};

		// Mock NoteUtils
		mockGetCurrentNote.mockReturnValue(mockCurrentFile);
		mockGetAllNotesWithTags.mockReturnValue(mockNotes);
		mockGetNotesForTag.mockReturnValue(mockNotes);

		// Mock SortUtils
		mockSortNotes.mockResolvedValue(mockSortedNotes);
	});

	describe("navigateToNext", () => {
		it("should navigate to next note successfully", async () => {
			const showToastMessages = true;
			const sortOrder = "title";
			const customOrder = {};

			await NavigationUtils.navigateToNext(
				mockApp,
				showToastMessages,
				sortOrder,
				customOrder
			);

			expect(mockGetCurrentNote).toHaveBeenCalledWith(mockApp);
			expect(mockGetAllNotesWithTags).toHaveBeenCalledWith(mockApp);
			expect(mockGetNotesForTag).toHaveBeenCalledWith(
				mockApp,
				"research"
			);
			expect(mockSortNotes).toHaveBeenCalledWith(
				mockNotes,
				"research",
				sortOrder,
				customOrder
			);
			expect(mockApp.workspace.getLeaf().openFile).toHaveBeenCalledWith(
				mockSortedNotes[1].file
			);
		});

		it("should show notice when no active note", async () => {
			const { Notice } = require("obsidian");
			mockGetCurrentNote.mockReturnValue(null);

			await NavigationUtils.navigateToNext(mockApp, true, "title", {});

			expect(Notice).toHaveBeenCalledWith("No active note");
			expect(mockApp.workspace.getLeaf().openFile).not.toHaveBeenCalled();
		});

		it("should show notice when current note has no tags", async () => {
			const { Notice } = require("obsidian");
			const noteWithoutTags = {
				file: mockCurrentFile,
				tags: [],
				frontmatter: {},
				title: "test1",
			};
			mockGetAllNotesWithTags.mockReturnValue([noteWithoutTags]);

			await NavigationUtils.navigateToNext(mockApp, true, "title", {});

			expect(Notice).toHaveBeenCalledWith("Current note has no tags");
			expect(mockApp.workspace.getLeaf().openFile).not.toHaveBeenCalled();
		});

		it("should not show notice when showToastMessages is false", async () => {
			const { Notice } = require("obsidian");
			mockGetCurrentNote.mockReturnValue(null);

			await NavigationUtils.navigateToNext(mockApp, false, "title", {});

			expect(Notice).not.toHaveBeenCalled();
		});

		it("should wrap around to first note when at last position", async () => {
			mockGetCurrentNote.mockReturnValue(mockNotes[2].file);
			mockGetAllNotesWithTags.mockReturnValue(mockNotes);
			mockGetNotesForTag.mockReturnValue(mockNotes);
			mockSortNotes.mockResolvedValue(mockSortedNotes);

			await NavigationUtils.navigateToNext(mockApp, true, "title", {});

			expect(mockApp.workspace.getLeaf().openFile).toHaveBeenCalledWith(
				mockSortedNotes[0].file
			);
		});

		it("should handle case when current note not found in sorted list", async () => {
			const { Notice } = require("obsidian");
			const differentNote = {
				file: new TFile("different.md", "different"),
				tags: ["research"],
				frontmatter: {},
				title: "different",
			};
			mockGetAllNotesWithTags.mockReturnValue([differentNote]);

			await NavigationUtils.navigateToNext(mockApp, true, "title", {});

			expect(mockApp.workspace.getLeaf().openFile).not.toHaveBeenCalled();
		});
	});

	describe("navigateToPrev", () => {
		it("should navigate to previous note successfully", async () => {
			const showToastMessages = true;
			const sortOrder = "title";
			const customOrder = {};

			await NavigationUtils.navigateToPrev(
				mockApp,
				showToastMessages,
				sortOrder,
				customOrder
			);

			expect(mockGetCurrentNote).toHaveBeenCalledWith(mockApp);
			expect(mockGetAllNotesWithTags).toHaveBeenCalledWith(mockApp);
			expect(mockGetNotesForTag).toHaveBeenCalledWith(
				mockApp,
				"research"
			);
			expect(mockSortNotes).toHaveBeenCalledWith(
				mockNotes,
				"research",
				sortOrder,
				customOrder
			);
			expect(mockApp.workspace.getLeaf().openFile).toHaveBeenCalledWith(
				mockSortedNotes[2].file
			);
		});

		it("should show notice when no active note", async () => {
			const { Notice } = require("obsidian");
			mockGetCurrentNote.mockReturnValue(null);

			await NavigationUtils.navigateToPrev(mockApp, true, "title", {});

			expect(Notice).toHaveBeenCalledWith("No active note");
			expect(mockApp.workspace.getLeaf().openFile).not.toHaveBeenCalled();
		});

		it("should show notice when current note has no tags", async () => {
			const { Notice } = require("obsidian");
			const noteWithoutTags = {
				file: mockCurrentFile,
				tags: [],
				frontmatter: {},
				title: "test1",
			};
			mockGetAllNotesWithTags.mockReturnValue([noteWithoutTags]);

			await NavigationUtils.navigateToPrev(mockApp, true, "title", {});

			expect(Notice).toHaveBeenCalledWith("Current note has no tags");
			expect(mockApp.workspace.getLeaf().openFile).not.toHaveBeenCalled();
		});

		it("should wrap around to last note when at first position", async () => {
			const firstNoteFile = new TFile("test1.md", "test1");
			const firstNote = {
				file: firstNoteFile,
				tags: ["research"],
				frontmatter: {},
				title: "test1",
			};
			const noteWithFirstPosition = {
				file: firstNote.file,
				tags: ["research"],
				frontmatter: {},
				title: "test1",
			};
			mockGetAllNotesWithTags.mockReturnValue([noteWithFirstPosition]);

			await NavigationUtils.navigateToPrev(mockApp, true, "title", {});

			expect(mockApp.workspace.getLeaf().openFile).toHaveBeenCalledWith(
				mockSortedNotes[2].file
			);
		});

		it("should handle case when current note not found in sorted list", async () => {
			const { Notice } = require("obsidian");
			const differentNote = {
				file: new TFile("different.md", "different"),
				tags: ["research"],
				frontmatter: {},
				title: "different",
			};
			mockGetAllNotesWithTags.mockReturnValue([differentNote]);

			await NavigationUtils.navigateToPrev(mockApp, true, "title", {});

			expect(mockApp.workspace.getLeaf().openFile).not.toHaveBeenCalled();
		});

		it("should show toast message with previous note name", async () => {
			const { Notice } = require("obsidian");

			await NavigationUtils.navigateToPrev(mockApp, true, "title", {});

			expect(Notice).toHaveBeenCalledWith("Previous: test3");
		});
	});
});
