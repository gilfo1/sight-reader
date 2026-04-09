import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { activeMidiNotes, currentStepIndex, initApp, resetGameState, setCurrentStepIndex, setMusicData } from '@/main';
import { resetStats, stats } from '@/engine/state';

describe('On-Screen Piano Keyboard', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    resetStats();
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

    expect(dock.style.position).toBe('fixed');
    expect(dock.style.bottom).toBe('0px');
    expect(details.open).toBe(true);
    expect(keyboard).not.toBeNull();
    expect(keyboard.querySelectorAll('button')).toHaveLength(30);
    expect(Array.from(keyboard.querySelectorAll('button')).every((key) => key.textContent === '')).toBe(true);
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
});
