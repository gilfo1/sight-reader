import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { initApp, resetGameState } from '@/main';
import { getSoundMode } from '@/audio/note-player';
import { SOUND_MODE } from '@/audio/sound-mode';

describe('Initial/Reset Application Status', () => {
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
    
    // Stub WebMidi
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map()
    });
  });

  it('should have onscreen keyboard closed and sound on with reverb by default', async () => {
    await initApp();
    
    // Check keyboard
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    expect(keyboardDetails.open).toBe(false);
    
    // Check sound mode
    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
  });
  
  it('should return to default state when "Reset to Defaults" is clicked', async () => {
    await initApp();
    
    // Change some state
    const keyboardDetails = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    keyboardDetails.open = true;
    keyboardDetails.dispatchEvent(new Event('toggle'));
    
    const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
    soundToggle.click(); // Toggle sound from Reverb to Off
    expect(getSoundMode()).toBe(SOUND_MODE.OFF);
    
    // Click "Reset to Defaults"
    const resetAllButton = document.getElementById('reset-all-settings') as HTMLButtonElement;
    // We need to confirm the dialog if any
    window.confirm = vi.fn().mockReturnValue(true);
    resetAllButton.click();
    
    // Keyboard should be closed
    expect(keyboardDetails.open).toBe(false);
    
    // Sound should be back to Reverb
    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
  });
});
