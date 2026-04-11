import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { 
  initApp,
  getUIConfig,
  resetGameState
} from '@/main';
import { loadFromStorage, saveToStorage } from '@/utils/storage';
import { setCurrentStaffNoteRange } from '@/ui/note-range';

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
      'stats-details': true,
      'piano-keyboard-details': false,
    };
    saveToStorage('accordion-state', accordionState);
    
    await initApp();
    
    const statsDetails = document.getElementById('stats-details') as HTMLDetailsElement;
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    
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

    setCurrentStaffNoteRange({ minNote: 'A0', maxNote: 'C8' }, true);
    
    const saved = loadFromStorage<any>('generator-config');
    expect(saved.minNote).toBe('A0');
    expect(saved.maxNote).toBe('C8');
    expect((document.getElementById('note-range-value-summary') as HTMLElement).textContent).toBe('a0 - c8');
  });

  it('should persist note ranges separately for each staff type', async () => {
    await initApp();

    const staffType = document.getElementById('staff-type') as HTMLSelectElement;
    setCurrentStaffNoteRange({ minNote: 'D1', maxNote: 'F5' }, true);

    staffType.value = 'treble';
    staffType.dispatchEvent(new Event('change'));
    setCurrentStaffNoteRange({ minNote: 'E3', maxNote: 'C5' }, true);

    staffType.value = 'bass';
    staffType.dispatchEvent(new Event('change'));
    setCurrentStaffNoteRange({ minNote: 'D1', maxNote: 'F2' }, true);

    document.body.innerHTML = new DOMParser().parseFromString(readFileSync('./index.html', 'utf-8'), 'text/html').body.innerHTML;
    await initApp();

    const reloadedStaffType = document.getElementById('staff-type') as HTMLSelectElement;
    const reloadedMinNote = document.getElementById('min-note') as HTMLInputElement;
    const reloadedMaxNote = document.getElementById('max-note') as HTMLInputElement;

    expect(reloadedMinNote.value).toBe('D1');
    expect(reloadedMaxNote.value).toBe('F2');

    reloadedStaffType.value = 'treble';
    reloadedStaffType.dispatchEvent(new Event('change'));
    expect(reloadedMinNote.value).toBe('E3');
    expect(reloadedMaxNote.value).toBe('C5');

    reloadedStaffType.value = 'grand';
    reloadedStaffType.dispatchEvent(new Event('change'));
    expect(reloadedMinNote.value).toBe('D1');
    expect(reloadedMaxNote.value).toBe('F5');
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

    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));
    const saved = loadFromStorage<any>('accordion-state');
    expect(saved['piano-keyboard-details']).toBe(true);
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
    soundToggle.click(); // Reverb -> Off

    expect(loadFromStorage('sound-mode')).toBe('off');

    document.body.innerHTML = new DOMParser().parseFromString(readFileSync('./index.html', 'utf-8'), 'text/html').body.innerHTML;
    await initApp();

    const reloadedToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    expect(reloadedToggle.dataset.enabled).toBe('false');
    expect(reloadedToggle.dataset.soundMode).toBe('off');
  });

  it('should reset all to defaults when Reset button is clicked', async () => {
    await initApp();
    
    // Change some things
    const measuresSelect = document.getElementById('measures-per-line') as HTMLSelectElement;
    measuresSelect.value = '8';
    measuresSelect.dispatchEvent(new Event('change'));
    
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));
    
    // Click reset
    const resetBtn = document.getElementById('reset-all-settings') as HTMLButtonElement;
    resetBtn.click();
    
    // Check if it reset in UI
    expect(measuresSelect.value).toBe('4'); // Default
    expect(keyboardDetails.open).toBe(false);
    
    // Check if storage is cleared
    expect(loadFromStorage('generator-config')).toEqual(expect.objectContaining({measuresPerLine: 4}));
    expect(loadFromStorage('app-stats')).toEqual(expect.objectContaining({notesPlayed: 0}));
  });
});
