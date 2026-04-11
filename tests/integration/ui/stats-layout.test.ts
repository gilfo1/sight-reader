import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('Stats UI Layout', () => {
  let html: string;
  let css: string;
  let doc: Document;

  beforeEach(() => {
    html = readFileSync('./index.html', 'utf-8');
    css = readFileSync('./src/styles/app.css', 'utf-8');
    doc = new DOMParser().parseFromString(html, 'text/html');
  });

  it('should have a stats accordion in the toolbar', () => {
    const toolbar = doc.querySelector('.app-toolbar');
    const statsAccordion = doc.getElementById('stats-details');
    expect(toolbar).not.toBeNull();
    expect(statsAccordion).not.toBeNull();
    expect(toolbar?.contains(statsAccordion)).toBe(true);
  });

  it('should have stats labels and values in items', () => {
    const statItems = doc.querySelectorAll('.stat-item');
    expect(statItems.length).toBeGreaterThanOrEqual(9);
    
    const playedItem = doc.querySelector('.stat-item');
    expect(playedItem?.querySelector('.stat-label')?.textContent).toBe('Played');
    expect(playedItem?.querySelector('#stats-played')).not.toBeNull();
  });

  it('should have a close button in the stats container', () => {
    const closeBtn = doc.getElementById('stats-close');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn?.classList.contains('stats-close')).toBe(true);
  });

  it('should have a stats icon in the summary', () => {
    const summary = doc.querySelector('.stats-summary');
    const icon = summary?.querySelector('svg.stats-icon');
    expect(icon).not.toBeNull();
  });

  it('should have a wide horizontal layout in CSS', () => {
    expect(css).toContain('.stats-container');
    expect(css).toContain('flex-direction: row;');
    expect(css).toContain('white-space: nowrap;');
  });

  it('should have labels on top of values in CSS', () => {
    expect(css).toContain('.stat-item');
    expect(css).toContain('flex-direction: column;');
  });

  it('should be vertically and horizontally centered in the toolbar', () => {
    expect(css).toContain('.stats-accordion');
    expect(css).toContain('position: absolute;');
    expect(css).toContain('left: 50%;');
    expect(css).toContain('top: 50%;');
    expect(css).toContain('transform: translate(-50%, -50%);');
  });

  it('should be responsive on mobile', () => {
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('flex-wrap: wrap;');
  });
});
