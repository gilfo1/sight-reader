import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('Responsive Layout System', () => {
  let html: string;
  let css: string;
  let doc: Document;

  beforeEach(() => {
    html = readFileSync('./index.html', 'utf-8');
    css = readFileSync('./src/styles/app.css', 'utf-8');
    doc = new DOMParser().parseFromString(html, 'text/html');
  });

  it('defines responsive breakpoints for medium and small screens', () => {
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('@media (max-width: 640px)');
  });

  it('defines chevron indicators for all accordion summary variants', () => {
    expect(css).toContain('.panel-summary::after');
    expect(css).toContain('.keyboard-summary::after');
    expect(css).toContain('.subpanel-summary::after');
    expect(css).toContain("border-right: 2px solid currentColor;");
    expect(css).toContain("border-bottom: 2px solid currentColor;");
    expect(css).toContain('details[open] > .panel-summary::after');
    expect(css).toContain('details[open] > .keyboard-summary::after');
    expect(css).toContain('details[open] > .subpanel-summary::after');
  });

  it('uses a grid layout that can collapse from two columns to one', () => {
    expect(css).toContain('.panel-grid');
    expect(css).toContain('grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.75fr);');
    expect(css).toContain('.panel-grid {\n    grid-template-columns: 1fr;');
  });

  it('makes the settings fields responsive through reusable control grids', () => {
    expect(doc.querySelectorAll('.control-grid').length).toBeGreaterThanOrEqual(2);
    expect(doc.querySelectorAll('.field-group').length).toBeGreaterThanOrEqual(6);
    expect(css).toContain('.control-grid');
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
  });

  it('keeps the score and keyboard horizontally scrollable on small screens', () => {
    expect(doc.querySelector('.output-shell')).not.toBeNull();
    expect(doc.querySelector('.keyboard-scroll')).not.toBeNull();
    expect(css).toContain('.output-shell');
    expect(css).toContain('overflow-x: auto;');
    expect(css).toContain('.keyboard-scroll');
    expect(css).toContain('-webkit-overflow-scrolling: touch;');
  });

  it('uses touch-friendly option chips and action buttons', () => {
    expect(doc.querySelectorAll('.option-chip').length).toBeGreaterThan(0);
    expect(doc.querySelectorAll('.action-button').length).toBeGreaterThan(0);
    expect(css).toContain('min-height: 44px;');
  });

  it('keeps the keyboard dock width adaptive on narrow screens', () => {
    expect(css).toContain('.keyboard-panel');
    expect(css).toContain('width: calc(100% - 16px);');
    expect(css).toContain('max-width: 1600px;');
    expect(css).toContain('width: calc(100% - 8px);');
  });

  it('styles the middle-C size toggle as a distinct interactive control', () => {
    expect(css).toContain('.piano-keyboard-size-toggle');
    expect(css).toContain('.piano-keyboard-size-dash');
    expect(css).toContain('flex-direction: column;');
    expect(css).toContain('background: #19a34a;');
    expect(css).toContain('0 0 10px rgba(25, 163, 74, 0.45)');
    expect(css).toContain('transform: translate(-50%, calc(-100% - 4px));');
    expect(css).toContain('.piano-keyboard-size-toggle:hover,');
    expect(css).toContain('.piano-keyboard-layout');
  });

  it('uses a tighter keyboard header and less rounded key corners', () => {
    expect(css).toContain('.keyboard-summary');
    expect(css).toContain('min-height: 24px;');
    expect(css).toContain('padding: 4px 18px;');
    expect(css).toContain('.keyboard-summary-label');
    expect(css).toContain('details[open] > .keyboard-summary .keyboard-summary-label');
    expect(css).toContain('.piano-key-white');
    expect(css).toContain('border-radius: 0 0 8px 8px;');
    expect(css).toContain('.piano-keyboard-layout[data-size-mode="small"] .piano-key-white');
    expect(css).toContain('border-radius: 0 0 4px 4px;');
  });
});
