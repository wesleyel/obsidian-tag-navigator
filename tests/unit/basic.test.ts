import { jest, describe, it, expect } from '@jest/globals';

describe('Basic Test Suite', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should handle simple math', () => {
    expect(2 + 2).toBe(4);
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
  });

  it('should work with async functions', async () => {
    const asyncFunction = async () => {
      return Promise.resolve('hello');
    };
    
    const result = await asyncFunction();
    expect(result).toBe('hello');
  });

  it('should work with mocks', () => {
    const mockFn = jest.fn();
    mockFn('test');
    
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  describe('Nested test suite', () => {
    it('should work in nested suites', () => {
      expect('nested').toMatch(/nest/);
    });
  });
}); 