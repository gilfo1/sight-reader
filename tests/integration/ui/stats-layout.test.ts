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
    const statsWrapper = doc.querySelector('.stats-accordion-wrapper');
    expect(toolbar).not.toBeNull();
    expect(statsAccordion).not.toBeNull();
    expect(statsWrapper).not.toBeNull();
    expect(toolbar?.contains(statsWrapper)).toBe(true);
    expect(statsWrapper?.contains(statsAccordion)).toBe(true);
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
    expect(css).toContain('display: flex;');
    expect(css).toContain('flex-direction: column;');
  });

  it('should be centered in the toolbar', () => {
    expect(css).toContain('.stats-accordion');
    expect(css).toContain('position: relative;');
    expect(css).toContain('.stats-accordion-wrapper');
    expect(css).toContain('justify-content: center;');
    expect(css).toContain('flex: 1;');
  });

  it('should have a wide grid layout in narrow CSS', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?display:\s*grid;/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(90px,\s*1fr\)\);/);
  });
});
