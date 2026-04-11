import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('Responsive Regression Checks', () => {
  let css: string;

  beforeEach(() => {
    css = readFileSync('./src/styles/app.css', 'utf-8');
  });

  it('maintains critical breakpoints', () => {
    expect(css).toContain('@media (max-width: 1024px)');
    expect(css).toContain('@media (max-width: 640px)');
  });

  describe('Mobile (640px) regression', () => {
    it('sets app-toolbar to sticky on mobile', () => {
      // We look for .app-toolbar within the 640px media query
      expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*{[\s\S]*?\.app-toolbar\s*{[\s\S]*?position:\s*sticky;/);
    });

    it('forces stats-container to full width on mobile', () => {
      expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*{[\s\S]*?\.stats-container\s*{[\s\S]*?width:\s*100vw;/);
    });

    it('ensures body has appropriate mobile padding', () => {
       expect(css).toMatch(/@media\s*\(max-width:\s*640px\)\s*{[\s\S]*?body\.app-shell\s*{[\s\S]*?padding-inline:\s*10px;/);
    });
  });

  describe('Tablet/Small Desktop (1024px) regression', () => {
    it('collapses panel-grid to single column', () => {
      expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?\.panel-grid\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
    });

    it('sets control-grid to 2 columns', () => {
      expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?\.control-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    });
    
    it('sets stats-grid to 2 columns', () => {
      expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)\s*{[\s\S]*?\.stats-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    });
  });

  it('ensures touch targets meet minimum requirements', () => {
    // 44px is the standard for touch targets
    expect(css).toContain('min-height: 44px;');
    expect(css).toContain('min-width: 44px;');
  });
});
