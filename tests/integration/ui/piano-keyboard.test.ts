import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { activeMidiNotes, currentStepIndex, initApp, resetGameState, setCurrentStepIndex, setMusicData } from '@/main';
import { resetStats, stats } from '@/engine/state';
import { getKeyboardSizeMode } from '@/ui/piano-keyboard';

describe('On-Screen Piano Keyboard', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    resetStats();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 960 });
    const html = readFileSync('./index.html', 'utf-8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    Array.from(doc.body.attributes).forEach((attribute) => {
      document.body.setAttribute(attribute.name, attribute.value);
    });
    window.confirm = vi.fn().mockReturnValue(true);
    Reflect.deleteProperty(window, 'AudioContext');
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map(),
    });
  });

  function setDeterministicScore(): void {
    setCurrentStepIndex(0);
    setMusicData([
      {
        pattern: ['q', 'q'],
        trebleSteps: [['C4'], ['D4']],
        bassSteps: [[], []],
        staffType: 'treble',
        keySignature: 'C',
      },
    ]);
  }

  it('renders a centered keyboard inside a bottom-fixed accordion', async () => {
    await initApp();

    const dock = document.getElementById('keyboard-dock') as HTMLDivElement;
    const details = document.getElementById('piano-keyboard-details') as HTMLDetailsElement;
    const keyboard = document.getElementById('piano-keyboard-layout') as HTMLDivElement;
    const sizeToggle = document.getElementById('piano-keyboard-size-toggle') as HTMLButtonElement;
    const middleCKey = document.querySelector('[data-note="C4"]') as HTMLButtonElement;

    expect(dock.classList.contains('keyboard-dock')).toBe(true);
    expect(details.classList.contains('keyboard-panel')).toBe(true);
    expect(details.open).toBe(true);
    expect(keyboard).not.toBeNull();
    expect(keyboard.dataset.sizeMode).toBe('large');
    expect(keyboard.querySelectorAll('.piano-key').length).toBeGreaterThan(30);
    expect(Array.from(keyboard.querySelectorAll('.piano-key')).every((key) => key.textContent === '')).toBe(true);
    expect(sizeToggle.dataset.sizeMode).toBe('large');
    expect(sizeToggle.title).toContain('Change keyboard size');
    expect(sizeToggle.querySelectorAll('.piano-keyboard-size-dash')).toHaveLength(3);
    expect(parseFloat(sizeToggle.style.left)).toBeGreaterThan(parseFloat(middleCKey.style.left));
  });

  it('pressing and releasing a key mirrors MIDI note state', async () => {
    await initApp();
    setDeterministicScore();

    const c4Key = document.querySelector('[data-note="C4"]') as HTMLButtonElement;
    c4Key.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(activeMidiNotes.has('C4')).toBe(true);
    expect((document.getElementById('current-note') as HTMLElement).textContent).toContain('C4');

    c4Key.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(activeMidiNotes.has('C4')).toBe(false);
  });

  it('advances the current step when the correct key is played', async () => {
    await initApp();
    setDeterministicScore();

    const targetKey = document.querySelector('[data-note="C4"]') as HTMLButtonElement;
    targetKey.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    targetKey.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(currentStepIndex).toBe(1);
  });

  it('records wrong-note stats when the wrong key is played', async () => {
    await initApp();
    setDeterministicScore();

    const wrongKey = document.querySelector('[data-note="C#4"]') as HTMLButtonElement;
    wrongKey.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(stats.notesPlayed).toBe(1);
    expect(stats.wrongNotes).toBe(1);
  });

  it('supports touch interaction as note input', async () => {
    await initApp();
    setDeterministicScore();

    const key = document.querySelector('[data-note="D4"]') as HTMLButtonElement;
    key.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }));
    expect(activeMidiNotes.has('D4')).toBe(true);

    key.dispatchEvent(new Event('touchend', { bubbles: true }));
    expect(activeMidiNotes.has('D4')).toBe(false);
  });

  it('cycles through keyboard sizes and shows more keys each time', async () => {
    await initApp();

    const sizeToggle = document.getElementById('piano-keyboard-size-toggle') as HTMLButtonElement;
    const largeCount = document.querySelectorAll('#piano-keyboard-layout .piano-key').length;

    sizeToggle.click();
    const mediumCount = document.querySelectorAll('#piano-keyboard-layout .piano-key').length;

    sizeToggle.click();
    const smallCount = document.querySelectorAll('#piano-keyboard-layout .piano-key').length;

    expect(largeCount).toBeLessThan(mediumCount);
    expect(mediumCount).toBeLessThan(smallCount);
    expect(getKeyboardSizeMode()).toBe('small');
    expect((document.getElementById('piano-keyboard-size-toggle') as HTMLButtonElement).dataset.sizeMode).toBe('small');
  });

  it('rebuilds the keyboard with more notes when the viewport grows', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 640 });
    await initApp();

    const narrowCount = document.querySelectorAll('#piano-keyboard-layout .piano-key').length;

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1280 });
    window.dispatchEvent(new Event('resize'));
    const wideCount = document.querySelectorAll('#piano-keyboard-layout .piano-key').length;

    expect(wideCount).toBeGreaterThan(narrowCount);
  });
});
