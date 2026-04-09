import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { 
  updateNoteSelectors, 
  initKeySignatures, 
  initSettingsModal,
  resetGameState,
  initMidiHandler
} from '@/main';
import { WebMidi } from 'webmidi';
import type { Input } from 'webmidi';

interface MockWebMidiShape {
  inputs: Input[];
}

// Mock WebMidi
vi.mock('webmidi', () => {
  return {
    WebMidi: {
      enable: vi.fn().mockResolvedValue(true),
      inputs: [],
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
  };
});

describe('User Interactions and Dynamic Controls', () => {
  beforeEach(() => {
    resetGameState();
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    Array.from(doc.body.attributes).forEach(attr => {
      document.body.setAttribute(attr.name, attr.value);
    });
    vi.clearAllMocks();
  });

  it('should filter note ranges based on staff type', () => {
    const staffType = document.getElementById('staff-type') as HTMLSelectElement;
    const minNote = document.getElementById('min-note') as HTMLSelectElement;
    
    // Treble Clef: range C3-C6
    staffType.value = 'treble';
    updateNoteSelectors();
    expect(minNote.options[0]!.value).toBe('C3');
    
    // Bass Clef: range C1-C5
    staffType.value = 'bass';
    updateNoteSelectors();
    expect(minNote.options[0]!.value).toBe('C1');
    expect(minNote.options[minNote.options.length - 1]!.value).toBe('C5');
  });

  it('should initialize key signature checkboxes correctly', () => {
    initKeySignatures(() => {});
    const cKey = document.getElementById('key-C') as HTMLInputElement;
    expect(cKey).not.toBeNull();
    expect(cKey.checked).toBe(true);
    
    const chromatic = document.getElementById('key-Chromatic');
    expect(chromatic).not.toBeNull();
  });

  it('should update MIDI indicator when a device connects', async () => {
    const mockInput = { name: 'Test Keyboard', addListener: vi.fn(), removeListener: vi.fn() };
    (WebMidi as unknown as MockWebMidiShape).inputs = [mockInput as unknown as Input];
    
    initMidiHandler();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const indicator = document.getElementById('midi-indicator')!;
    const name = document.getElementById('midi-device-name')!;
    
    expect(indicator.style.backgroundColor).toBe('green');
    expect(name.textContent).toBe('Test Keyboard');
  });

  it('should toggle the settings modal and remaining accordions', () => {
    initSettingsModal();
    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    const modal = document.getElementById('settings-modal') as HTMLElement;
    const stats = document.getElementById('stats-details') as HTMLDetailsElement;

    expect(modal.hidden).toBe(true);
    menuButton.click();
    expect(modal.hidden).toBe(false);

    expect(stats.open).toBe(false);
    stats.open = true;
    expect(stats.open).toBe(true);
  });
});
