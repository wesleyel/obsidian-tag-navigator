// Jest setup file
import { jest } from '@jest/globals';

// Set up global test environment
global.jest = jest;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Polyfill for Obsidian's .empty() and .addClass() methods on HTMLElement
if (!HTMLElement.prototype.empty) {
  HTMLElement.prototype.empty = function () {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  };
}
if (!HTMLElement.prototype.addClass) {
  HTMLElement.prototype.addClass = function (cls) {
    if (typeof cls === 'string') {
      cls.split(' ').forEach((c) => {
        if (c) this.classList.add(c);
      });
    }
  };
}
// Polyfill for Obsidian's .createEl method
if (!HTMLElement.prototype.createEl) {
  HTMLElement.prototype.createEl = function (tag: string, options: any = {}) {
    const el = document.createElement(tag);
    if (options.cls) {
      if (Array.isArray(options.cls)) {
        options.cls.forEach((c: string) => {
          if (c) el.classList.add(c);
        });
      } else if (typeof options.cls === 'string') {
        options.cls.split(' ').forEach((c: string) => {
          if (c) el.classList.add(c);
        });
      }
    }
    if (options.text) {
      el.textContent = options.text;
    }
    this.appendChild(el);
    return el as any;
  };
} 