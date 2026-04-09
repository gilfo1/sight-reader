import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { 
  initApp,
  getUIConfig,
  resetGameState
} from '@/main';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

describe('UI Persistence Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    // Copy attributes from body
    Array.from(doc.body.attributes).forEach(attr => {
      document.body.setAttribute(attr.name, attr.value);
    });
    vi.clearAllMocks();
    
    // Mock confirm
    window.confirm = vi.fn().mockReturnValue(true);

    // Stub WebMidi
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map()
    });
  });

  it('should load settings from localStorage on init', async () => {
    const customConfig = {
      staffType: 'bass',
      measuresPerLine: 2,
      isAdaptive: true
    };
    saveToStorage('generator-config', customConfig);
    
    await initApp();
    
    const config = getUIConfig();
    expect(config.staffType).toBe('bass');
    expect(config.measuresPerLine).toBe(2);
    expect(config.isAdaptive).toBe(true);
  });

  it('should load accordion state from localStorage on init', async () => {
    const accordionState = {
      'settings-details': false,
      'stats-details': true,
      'piano-keyboard-details': false,
    };
    saveToStorage('accordion-state', accordionState);
    
    await initApp();
    
    const settingsDetails = document.getElementById('settings-details') as HTMLDetailsElement;
    const statsDetails = document.getElementById('stats-details') as HTMLDetailsElement;
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    
    expect(settingsDetails.open).toBe(false);
    expect(statsDetails.open).toBe(true);
    expect(keyboardDetails.open).toBe(false);
  });

  it('should save settings when UI changes', async () => {
    await initApp();
    
    const measuresSelect = document.getElementById('measures-per-line') as HTMLSelectElement;
    measuresSelect.value = '6';
    measuresSelect.dispatchEvent(new Event('change'));
    
    const saved = loadFromStorage<any>('generator-config');
    expect(saved.measuresPerLine).toBe(6);
  });

  it('should persist multiple key signature selections', async () => {
    await initApp();
    
    const keyC = document.getElementById('key-C') as HTMLInputElement;
    const keyG = document.getElementById('key-G') as HTMLInputElement;
    
    keyC.checked = true;
    keyG.checked = true;
    keyC.dispatchEvent(new Event('change'));
    keyG.dispatchEvent(new Event('change'));
    
    const saved = loadFromStorage<any>('generator-config');
    expect(saved.selectedKeySignatures).toContain('C');
    expect(saved.selectedKeySignatures).toContain('G');
    
    // Reset and reload app to see if it's applied
    document.body.innerHTML = ''; // Clear DOM
    const html = readFileSync('./index.html', 'utf-8');
    document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
    
    await initApp();
    
    const keyC2 = document.getElementById('key-C') as HTMLInputElement;
    const keyG2 = document.getElementById('key-G') as HTMLInputElement;
    expect(keyC2.checked).toBe(true);
    expect(keyG2.checked).toBe(true);
  });

  it('should persist multiple note value selections', async () => {
    await initApp();
    
    const nvQ = document.querySelector('#note-values input[value="q"]') as HTMLInputElement;
    const nv8 = document.querySelector('#note-values input[value="8"]') as HTMLInputElement;
    
    nvQ.checked = true;
    nv8.checked = true;
    nvQ.dispatchEvent(new Event('change'));
    nv8.dispatchEvent(new Event('change'));
    
    const saved = loadFromStorage<any>('generator-config');
    expect(saved.selectedNoteValues).toContain('q');
    expect(saved.selectedNoteValues).toContain('8');
  });

  it('should persist min and max note selections', async () => {
    await initApp();
    
    const minNote = document.getElementById('min-note') as HTMLSelectElement;
    const maxNote = document.getElementById('max-note') as HTMLSelectElement;
    
    minNote.value = 'A0';
    maxNote.value = 'C8';
    minNote.dispatchEvent(new Event('change'));
    maxNote.dispatchEvent(new Event('change'));
    
    const saved = loadFromStorage<any>('generator-config');
    expect(saved.minNote).toBe('A0');
    expect(saved.maxNote).toBe('C8');
  });

  it('should persist chromatic setting', async () => {
    await initApp();
    
    const chromatic = document.getElementById('key-Chromatic') as HTMLInputElement;
    chromatic.checked = true;
    chromatic.dispatchEvent(new Event('change'));
    
    const saved = loadFromStorage<any>('generator-config');
    expect(saved.isChromatic).toBe(true);
  });

  it('should save accordion state when toggled', async () => {
    await initApp();
    
    const settingsDetails = document.getElementById('settings-details') as HTMLDetailsElement;
    settingsDetails.open = true;
    settingsDetails.dispatchEvent(new Event('toggle'));
    
    const saved = loadFromStorage<any>('accordion-state');
    expect(saved['settings-details']).toBe(true);
    
    settingsDetails.open = false;
    settingsDetails.dispatchEvent(new Event('toggle'));
    const saved2 = loadFromStorage<any>('accordion-state');
    expect(saved2['settings-details']).toBe(false);

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = false;
    keyboardDetails.dispatchEvent(new Event('toggle'));
    const saved3 = loadFromStorage<any>('accordion-state');
    expect(saved3['piano-keyboard-details']).toBe(false);
  });

  it('should persist the keyboard size mode when the size toggle is used', async () => {
    await initApp();

    const sizeToggle = document.getElementById('piano-keyboard-size-toggle') as HTMLButtonElement;
    sizeToggle.click();

    expect(loadFromStorage('keyboard-size-mode')).toBe('medium');

    document.body.innerHTML = new DOMParser().parseFromString(readFileSync('./index.html', 'utf-8'), 'text/html').body.innerHTML;
    await initApp();

    const layout = document.getElementById('piano-keyboard-layout') as HTMLDivElement;
    expect(layout.dataset.sizeMode).toBe('medium');
  });

  it('should persist the sound toggle state', async () => {
    await initApp();

    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    soundToggle.click();

    expect(loadFromStorage('sound-enabled')).toBe(false);

    document.body.innerHTML = new DOMParser().parseFromString(readFileSync('./index.html', 'utf-8'), 'text/html').body.innerHTML;
    await initApp();

    expect((document.getElementById('sound-toggle') as HTMLButtonElement).dataset.enabled).toBe('false');
  });

  it('should reset all to defaults when Reset button is clicked', async () => {
    await initApp();
    
    // Change some things
    const measuresSelect = document.getElementById('measures-per-line') as HTMLSelectElement;
    measuresSelect.value = '8';
    measuresSelect.dispatchEvent(new Event('change'));
    
    const settingsDetails = document.getElementById('settings-details') as HTMLDetailsElement;
    settingsDetails.open = false;
    settingsDetails.dispatchEvent(new Event('toggle'));

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = false;
    keyboardDetails.dispatchEvent(new Event('toggle'));
    
    // Click reset
    const resetBtn = document.getElementById('reset-all-settings') as HTMLButtonElement;
    resetBtn.click();
    
    // Check if it reset in UI
    expect(measuresSelect.value).toBe('4'); // Default
    expect(settingsDetails.open).toBe(true);
    expect(keyboardDetails.open).toBe(true);
    
    // Check if storage is cleared
    expect(loadFromStorage('generator-config')).toEqual(expect.objectContaining({measuresPerLine: 4}));
    expect(loadFromStorage('app-stats')).toEqual(expect.objectContaining({notesPlayed: 0}));
  });
});
