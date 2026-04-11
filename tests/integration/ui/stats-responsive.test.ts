import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';

describe('Stats Responsive Layout', () => {
  let css: string;

  beforeEach(() => {
    css = readFileSync('./src/styles/app.css', 'utf-8');
  });

  it('should have a media query for 1024px or similar', () => {
    expect(css).toContain('@media (max-width: 1024px)');
  });

  it('should move stats container below toolbar on narrow screens', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?\.stats-container\s*{[\s\S]*?position:\s*relative/);
  });

  it('should hide specific stats on narrow screens', () => {
    expect(css).toMatch(/\.stat-item:nth-child\(2\), \/\* Played \*\//);
    expect(css).toMatch(/display: none;/);
  });

  it('should evenly space stats in the container on narrow screens', () => {
    expect(css).toMatch(/\.stats-container\s*{[\s\S]*?justify-content:\s*space-evenly/);
    expect(css).toMatch(/\.stats-container\s*{[\s\S]*?display:\s*flex/);
  });

  it('should have reduced padding and flex layout at 1024px breakpoint', () => {
    const sectionMatch = css.match(/@media\s*\(max-width:\s*1024px\)\s*{([\s\S]*?})\s*}/);
    expect(sectionMatch).toBeTruthy();
    const section = sectionMatch![0];
    const statsContainerBlock = section.match(/\.stats-container\s*{([\s\S]*?)}/);
    expect(statsContainerBlock).toBeTruthy();
    const content = statsContainerBlock![1];
    expect(content).toMatch(/padding:\s*24px\s*8px\s*6px\s*8px/);
    expect(content).toMatch(/gap:\s*6px\s*10px/);
    expect(content).toMatch(/flex-wrap:\s*wrap/);
  });
});
