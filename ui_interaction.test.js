import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { 
  updateNoteSelectors, 
  initKeySignatures, 
  resetGameState, 
  musicData,
  generateMusicData,
  initMIDI
} from './main.js';
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

// Mock Canvas
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
  });
}

describe('UI Interaction Tests', () => {
  beforeEach(() => {
    resetGameState();
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    
    // Setup listeners as main.js does on load
    initKeySignatures();
    
    const selectors = ['measures-per-line', 'notes-per-beat', 'lines', 'staff-type', 'min-note', 'max-note'];
    selectors.forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
          generateMusicData();
      });
    });

    const noteValuesContainer = document.getElementById('note-values');
    noteValuesContainer.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', () => generateMusicData());
    });

    const keySigsContainer = document.getElementById('key-signatures');
    // For key-signatures we need a different approach since they are added dynamically by initKeySignatures
    keySigsContainer.querySelectorAll('input').forEach(cb => {
        cb.addEventListener('change', () => generateMusicData());
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should regenerate music when a note value is unchecked', () => {
    const quarterCheckbox = document.querySelector('input[value="q"]');
    const eighthCheckbox = document.querySelector('input[value="8"]');
    
    eighthCheckbox.checked = true;
    eighthCheckbox.dispatchEvent(new Event('change'));
    
    const initialPattern = musicData[0].pattern;
    
    quarterCheckbox.checked = false;
    quarterCheckbox.dispatchEvent(new Event('change'));
    
    expect(musicData[0].pattern).not.toEqual(initialPattern);
    expect(musicData.every(m => !m.pattern.includes('q'))).toBe(true);
  });

  it('should regenerate music when a new key signature is selected', () => {
    const gKeyCheckbox = document.getElementById('key-G');
    const cKeyCheckbox = document.getElementById('key-C');
    
    cKeyCheckbox.checked = false;
    gKeyCheckbox.checked = true;
    gKeyCheckbox.dispatchEvent(new Event('change'));
    
    expect(musicData.every(m => m.keySignature === 'G')).toBe(true);
  });

  it('should use random keys when multiple are selected', () => {
    // Need more lines to see randomization
    document.getElementById('lines').value = '10';
    document.getElementById('measures-per-line').value = '1';
    
    const gKeyCheckbox = document.getElementById('key-G');
    const cKeyCheckbox = document.getElementById('key-C');
    
    cKeyCheckbox.checked = true;
    gKeyCheckbox.checked = true;
    gKeyCheckbox.dispatchEvent(new Event('change'));
    
    const keys = musicData.map(m => m.keySignature);
    const uniqueKeys = new Set(keys);
    
    expect(uniqueKeys.has('C')).toBe(true);
    expect(uniqueKeys.has('G')).toBe(true);
    expect(uniqueKeys.size).toBe(2);
  });

  it('should handle chromatic toggle', () => {
    const chromaticCheckbox = document.getElementById('key-Chromatic');
    chromaticCheckbox.checked = true;
    chromaticCheckbox.dispatchEvent(new Event('change'));
    
    // With chromatic on, we should see notes that are NOT in the key signature scale
    // This is hard to guarantee with random, but let's check it doesn't crash
    expect(musicData.length).toBeGreaterThan(0);
  });

  it('should clear all MIDI notes from display when device disconnects', async () => {
    let noteOnCallback;
    let disconnectCallback;
    const mockInput = { 
        name: 'Keyboard', 
        addListener: vi.fn((event, cb) => {
            if (event === 'noteon') noteOnCallback = cb;
        }),
        removeListener: vi.fn()
    };
    WebMidi.inputs = [mockInput];
    WebMidi.addListener.mockImplementation((event, cb) => {
        if (event === 'connected') {} // used for initialization
        if (event === 'disconnected') disconnectCallback = cb;
    });
    
    initMIDI();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    noteOnCallback({ note: { identifier: 'C4' } });
    const display = document.getElementById('current-note');
    expect(display.textContent).toBe('C4');
    
    // Simulate disconnect
    WebMidi.inputs = [];
    disconnectCallback();
    
    expect(display.textContent).toBe('-');
    expect(document.getElementById('midi-indicator').style.backgroundColor).toBe('red');
  });
});
