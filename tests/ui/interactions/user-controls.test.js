import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { 
  updateNoteSelectors, 
  initKeySignatures, 
  resetGameState,
  initMIDI
} from '../../../src/main.js';
import { WebMidi } from 'webmidi';

// Mock WebMidi
vi.mock('webmidi', () => {
  const listeners = {};
  return {
    WebMidi: {
      enable: vi.fn().mockResolvedValue(true),
      inputs: [],
      addListener: vi.fn((event, callback) => {
        listeners[event] = callback;
      }),
      removeListener: vi.fn(),
      _trigger: (event, data) => {
        if (listeners[event]) listeners[event](data);
      }
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
    // Copy attributes from body
    Array.from(doc.body.attributes).forEach(attr => {
      document.body.setAttribute(attr.name, attr.value);
    });
    vi.clearAllMocks();
  });

  it('should filter note ranges based on staff type', () => {
    const staffType = document.getElementById('staff-type');
    const minNote = document.getElementById('min-note');
    
    // Treble Clef: range C3-C6
    staffType.value = 'treble';
    updateNoteSelectors();
    expect(minNote.options[0].value).toBe('C3');
    
    // Bass Clef: range C1-C5
    staffType.value = 'bass';
    updateNoteSelectors();
    expect(minNote.options[0].value).toBe('C1');
    expect(minNote.options[minNote.options.length - 1].value).toBe('C5');
  });

  it('should initialize key signature checkboxes correctly', () => {
    initKeySignatures();
    const container = document.getElementById('key-signatures');
    const cKey = document.getElementById('key-C');
    expect(cKey).not.toBeNull();
    expect(cKey.checked).toBe(true);
    
    const chromatic = document.getElementById('key-Chromatic');
    expect(chromatic).not.toBeNull();
  });

  it('should update MIDI indicator when a device connects', async () => {
    const mockInput = { name: 'Test Keyboard', addListener: vi.fn(), removeListener: vi.fn() };
    WebMidi.inputs = [mockInput];
    
    initMIDI();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const indicator = document.getElementById('midi-indicator');
    const name = document.getElementById('midi-device-name');
    
    expect(indicator.style.backgroundColor).toBe('green');
    expect(name.textContent).toBe('Test Keyboard');
  });

  it('should toggle accordion states', () => {
    const settings = document.querySelector('details');
    expect(settings.open).toBe(false);
    settings.open = true;
    expect(settings.open).toBe(true);
  });
});
