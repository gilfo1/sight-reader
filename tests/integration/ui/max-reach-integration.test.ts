import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { 
  resetGameState,
  initApp,
  getUIConfig
} from '@/main';

describe('Max Hand Reach UI Integration', () => {
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
    
    // Stub WebMidi
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map()
    });
  });

  it('should update maxReach in state when UI changes', async () => {
    // Initialize app which sets up event listeners
    initApp();
    
    const maxReachSelect = document.getElementById('max-reach') as HTMLSelectElement;
    expect(maxReachSelect.value).toBe('13'); // Default is now 13 (Octave / 12 half steps)
    
    // Change to -5 (7 semitones)
    maxReachSelect.value = '7';
    maxReachSelect.dispatchEvent(new Event('change'));
    
    const config = getUIConfig();
    expect(config.maxReach).toBe(7);
  });

  it('should trigger music regeneration when maxReach changes', async () => {
    // We need to check if musicData is updated. 
    
    // Let's use a more direct approach: check if the global musicData in state is updated.
    const { musicData } = await import('../../../src/engine/state');
    const initialSnapshot = JSON.stringify(musicData);
    
    initApp();
    
    const maxReachSelect = document.getElementById('max-reach') as HTMLSelectElement;
    maxReachSelect.value = '5'; // Very small reach (-7 half steps)
    maxReachSelect.dispatchEvent(new Event('change'));
    
    // musicData should be different now
    const newSnapshot = JSON.stringify(musicData);
    expect(newSnapshot).not.toBe(initialSnapshot);
  });
});
