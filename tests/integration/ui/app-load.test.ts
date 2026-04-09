import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState } from '@/engine/state';

describe('Application Initial Load', () => {
  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="output"></div>
      <select id="measures-per-line"><option value="4">4</option></select>
      <select id="lines"><option value="1">1</option></select>
      <select id="staff-type"><option value="grand">Grand Staff</option></select>
      <select id="notes-per-step"><option value="1">1</option></select>
      <select id="min-note"><option value="C4">C4</option></select>
      <select id="max-note"><option value="C5">C5</option></select>
      <div id="note-values">
        <input type="checkbox" value="q" checked>
      </div>
      <div id="key-signatures"></div>
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
    `;
  });

  it('should have the correct document title', async () => {
    await import('@/main');
    expect(document.title).toBe('sight-reader');
  });

  it('should render the score on load', async () => {
    const { renderScore } = await import('@/main');
    
    renderScore();
    const svg = document.querySelector('#output svg');
    expect(svg).not.toBeNull();
  });
});
