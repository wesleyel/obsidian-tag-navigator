// Mock Obsidian API for testing



export class TFile {
  path: string;
  basename: string;
  name: string;
  extension: string;
  vault: any;
  parent: any;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };

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

export class TFolder {
  path: string;
  name: string;

  constructor(path: string, name: string) {
    this.path = path;
    this.name = name;
  }
}

// Mock Element interface
interface MockElement {
  empty: jest.Mock;
  createEl: jest.Mock;
  setText: jest.Mock;
  addClass: jest.Mock;
  removeClass: jest.Mock;
  textContent: string;
  onclick: any;
  ondragstart: any;
  ondragend: any;
  ondragover: any;
  ondrop: any;
  ondragleave: any;
  draggable: boolean;
  dataset: any;
  classList: any;
  querySelector: jest.Mock;
  querySelectorAll: jest.Mock;
  getBoundingClientRect: jest.Mock;
  insertBefore: jest.Mock;
  parentElement: any;
}

// Create mock element and set up circular references
const mockElement = createMockElement();
if (mockElement.createEl && typeof mockElement.createEl === 'function') {
  const originalCreateEl = mockElement.createEl;
  mockElement.createEl = (tag: string, options?: any) => {
    const newElement = createMockElement();
    if (options?.text) newElement.textContent = options.text;
    if (options?.cls) newElement.className = options.cls;
    return newElement;
  };
}

export class Plugin {
  app: any;
  manifest: any;
  settings: any = {};

  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadSettings() {
    return this.settings;
  }

  async saveSettings() {
    // Mock implementation
  }

  addCommand(command: any) {
    // Mock implementation
  }

  addRibbonIcon(icon: string, title: string, callback: () => void) {
    // Mock implementation
  }

  registerView(viewType: string, viewCreator: any) {
    // Mock implementation
  }

  addSettingTab(settingTab: any) {
    // Mock implementation
  }
}

export class ItemView {
  containerEl: HTMLElement;
  contentEl: HTMLElement;
  app: any;
  leaf: any;

  constructor(leaf: any) {
    this.leaf = leaf;
    this.app = leaf?.app;
    this.containerEl = createMockElement() as any;
    this.contentEl = createMockElement() as any;
  }

  getViewType(): string {
    return 'mock-view';
  }

  getDisplayText(): string {
    return 'Mock View';
  }

  getIcon(): string {
    return 'mock-icon';
  }

  async onOpen() {
    // Mock implementation
  }

  async onClose() {
    // Mock implementation
  }
}

export class Setting {
  settingEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = createMockElement() as any;
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(callback: (text: any) => void): this {
    callback({
      setPlaceholder: () => ({ setValue: () => ({ onChange: () => ({}) }) })
    });
    return this;
  }

  addDropdown(callback: (dropdown: any) => void): this {
    callback({
      addOption: () => ({ setValue: () => ({ onChange: () => ({}) }) })
    });
    return this;
  }

  addToggle(callback: (toggle: any) => void): this {
    callback({
      setValue: () => ({ onChange: () => ({}) })
    });
    return this;
  }
}

export class Modal {
  app: any;
  containerEl: HTMLElement;
  contentEl: HTMLElement;

  constructor(app: any) {
    this.app = app;
    this.containerEl = createMockElement() as any;
    this.contentEl = createMockElement() as any;
  }

  open() {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }
}

export class Notice {
  constructor(message: string, timeout?: number) {
    // Mock implementation
  }
}

export class MarkdownView {
  file: TFile | null = null;
  
  constructor(file?: TFile) {
    this.file = file || null;
  }
}

export class WorkspaceLeaf {
  app: any;
  view: any;

  constructor(app: any) {
    this.app = app;
  }

  openFile(file: TFile) {
    return Promise.resolve();
  }
}

export const mockVault = {
  getMarkdownFiles: jest.fn().mockReturnValue([]),
  getAbstractFileByPath: jest.fn().mockReturnValue(null),
  create: jest.fn().mockResolvedValue(new TFile('test.md', 'test')),
  modify: jest.fn().mockResolvedValue(undefined),
  createFolder: jest.fn().mockResolvedValue(new TFolder('test', 'test'))
};

const mockMetadataCache = {
  getFileCache: jest.fn().mockReturnValue({
    tags: [],
    frontmatter: {}
  })
};

const mockWorkspace = {
  getActiveViewOfType: jest.fn().mockReturnValue(null),
  getMostRecentLeaf: jest.fn().mockReturnValue(new WorkspaceLeaf(null)),
  getLeavesOfType: jest.fn().mockReturnValue([]),
  getLeaf: jest.fn().mockReturnValue(new WorkspaceLeaf(null)),
  getRightLeaf: jest.fn().mockReturnValue(new WorkspaceLeaf(null)),
  revealLeaf: jest.fn(),
  detachLeavesOfType: jest.fn()
};

const mockApp = {
  vault: mockVault,
  metadataCache: mockMetadataCache,
  workspace: mockWorkspace
};

export function getAllTags(cache: any): string[] {
  if (!cache?.tags) return [];
  return cache.tags.map((tag: any) => {
    if (typeof tag === 'string') return tag;
    if (tag.tag) return tag.tag;
    return '';
  }).filter(Boolean);
}

// Export mocks for external use
export const mockObjects = {
  mockApp,
  mockVault,
  mockMetadataCache,
  mockWorkspace,
  mockElement
};

// Helper function to create mock DOM elements
function createMockElement(): any {
  const mockFn = () => {};
  const mockElement = {
    // Basic properties
    textContent: '',
    innerHTML: '',
    className: '',
    id: '',
    tagName: 'DIV',
    onclick: null as any,
    onchange: null as any,
    style: {} as any,
    dataset: {} as any,
    
    // Methods
    createEl: mockFn,
    setText: mockFn,
    addClass: mockFn,
    removeClass: mockFn,
    empty: mockFn,
    appendChild: mockFn,
    
    // Event methods
    addEventListener: mockFn,
    removeEventListener: mockFn,
    
    // Query methods  
    querySelector: () => null,
    querySelectorAll: () => [],
    
    // Properties that should be mockable
    get value() { return this._value || ''; },
    set value(val: string) { this._value = val; },
    _value: '',
    
    get checked() { return this._checked || false; },
    set checked(val: boolean) { this._checked = val; },
    _checked: false
  };
  
  // Override createEl to return a new mock element
  (mockElement as any).createEl = (tag: string, options?: any) => {
    const newElement = createMockElement();
    if (options?.text) newElement.textContent = options.text;
    if (options?.cls) newElement.className = options.cls;
    if (options?.attr) {
      Object.assign(newElement, options.attr);
    }
    return newElement;
  };
  
  return mockElement;
} 