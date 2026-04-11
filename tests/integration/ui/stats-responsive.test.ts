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

  it('should move stats container below toolbar on narrow screens using Grid', () => {
    // Check for the specific positioning in the media query to avoid overlap
    // The container should be in the second row of the grid
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?\.stats-container\s*{[\s\S]*?grid-row:\s*2/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?\.stats-container\s*{[\s\S]*?position:\s*relative/);
  });

  it('should ensure hamburger is left and speaker is right on narrow screens', () => {
    // This is handled by justify-content: space-between on .app-toolbar
    expect(css).toContain('justify-content: space-between;');
  });
});
