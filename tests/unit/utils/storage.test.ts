import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToStorage, loadFromStorage, clearStorage, removeFromStorage } from '@/utils/storage';

describe('Storage Utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and load an object', () => {
    const data = { a: 1, b: 'test' };
    saveToStorage('test-key', data);
    
    const loaded = loadFromStorage<typeof data>('test-key');
    expect(loaded).toEqual(data);
  });

  it('should return null if key does not exist', () => {
    const loaded = loadFromStorage('non-existent');
    expect(loaded).toBeNull();
  });

  it('should remove an item', () => {
    saveToStorage('key', 'val');
    removeFromStorage('key');
    expect(loadFromStorage('key')).toBeNull();
  });

  it('should clear all storage', () => {
    saveToStorage('k1', 1);
    saveToStorage('k2', 2);
    clearStorage();
    expect(loadFromStorage('k1')).toBeNull();
    expect(loadFromStorage('k2')).toBeNull();
  });

  it('should handle invalid JSON gracefully', () => {
    localStorage.setItem('invalid', 'not json');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaded = loadFromStorage('invalid');
    expect(loaded).toBeNull();
    expect(spy).toHaveBeenCalled();
  });
});
