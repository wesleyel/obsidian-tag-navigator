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