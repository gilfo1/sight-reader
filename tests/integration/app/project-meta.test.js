import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('Project Metadata and Structure', () => {
  it('should have an index.html with correct basic structure', () => {
    const html = readFileSync('./index.html', 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('id="output"');
    expect(html).toContain('id="controls"');
  });

  it('should have MIDI container elements in index.html', () => {
    const html = readFileSync('./index.html', 'utf-8');
    expect(html).toContain('id="midi-status"');
    expect(html).toContain('id="midi-device-name"');
    expect(html).toContain('id="midi-indicator"');
    expect(html).toContain('id="note-display"');
  });

  it('should have a main.js entry point defined in index.html', () => {
    const html = readFileSync('./index.html', 'utf-8');
    expect(html).toContain('src="/src/main.js"');
  });

  it('should include necessary dependencies in package.json', () => {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    expect(pkg.dependencies.webmidi).toBeDefined();
    expect(pkg.dependencies.vexflow).toBeDefined();
    expect(pkg.devDependencies.vitest).toBeDefined();
  });
});
