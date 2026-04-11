import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { initApp, resetGameState } from '@/main';
import { getKeyboardSizeMode } from '@/ui/piano-keyboard';

describe('Piano Keyboard Extra-Small Responsive Sizing', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    const html = readFileSync('./index.html', 'utf-8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    Array.from(doc.body.attributes).forEach((attribute) => {
      document.body.setAttribute(attribute.name, attribute.value);
    });
    window.confirm = vi.fn().mockReturnValue(true);
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map(),
    });
  });

  it('switches to extra-small when small cannot fit 2 octaves (14 white keys)', async () => {
    // 14 white keys at 'small' size (34px each) = 476px.
    // Plus 40px gutter = 516px.
    // Let's set viewport to 500px, which should trigger extra-small.
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 500 });
    
    await initApp();
    
    // Default is 'small', but it should responsively switch to 'extra-small'
    expect(getKeyboardSizeMode()).toBe('extra-small');
  });

  it('stays at small when viewport is wide enough for 2 octaves', async () => {
    // 600px is enough for 14 * 34 = 476px.
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 600 });
    
    await initApp();
    
    expect(getKeyboardSizeMode()).toBe('small');
  });
});
