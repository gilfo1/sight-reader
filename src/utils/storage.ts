export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

export function loadFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Failed to load from storage', e);
    return null;
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(key);
}

export function clearStorage(): void {
  localStorage.clear();
}
