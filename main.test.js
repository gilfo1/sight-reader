import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { renderStaff } from './main.js';

describe('Music Staff Project', () => {
  it('should have an index.html with an output container', () => {
    const html = readFileSync('./index.html', 'utf-8');
    expect(html).toContain('id="output"');
  });

  it('should have a main.js file that exports renderStaff', async () => {
    const main = await import('./main.js');
    expect(main.renderStaff).toBeDefined();
    expect(typeof main.renderStaff).toBe('function');
  });

  it('should include VexFlow dependency in package.json', () => {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    expect(pkg.dependencies.vexflow).toBeDefined();
  });

  describe('Staff Rendering', () => {
    let div;

    beforeEach(() => {
      document.body.innerHTML = '<div id="output"></div>';
      div = document.getElementById('output');
    });

    it('should render a music staff into the div', () => {
      renderStaff(div);
      
      const svg = div.querySelector('svg');
      expect(svg).not.toBeNull();
      
      // Check for staves
      const staves = div.querySelectorAll('.vf-stave');
      expect(staves.length).toBeGreaterThanOrEqual(2);

      // Check for clefs (treble and bass)
      const clefs = div.querySelectorAll('.vf-clef');
      expect(clefs.length).toBeGreaterThanOrEqual(2);

      // Check for notes
      const notes = div.querySelectorAll('.vf-stavenote');
      expect(notes.length).toBeGreaterThan(0);
    });
  });
});
