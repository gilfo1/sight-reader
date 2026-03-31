import { describe, it, expect } from 'vitest';
import { getRandomPitches } from '../../src/engine/generator.js';
import { getNoteValue } from '../../src/utils/music-theory.js';

describe('Chromatic and Enharmonic Regression', () => {
  it('should match MIDI values correctly for enharmonics', () => {
    // D# and Eb should have the same MIDI value
    expect(getNoteValue('D#4')).toBe(getNoteValue('Eb4'));
    expect(getNoteValue('C#4')).toBe(getNoteValue('Db4'));
    expect(getNoteValue('F#4')).toBe(getNoteValue('Gb4'));
    expect(getNoteValue('G#4')).toBe(getNoteValue('Ab4'));
    expect(getNoteValue('A#4')).toBe(getNoteValue('Bb4'));
  });

  it('should generate notes within the full 88-key piano range', () => {
    const a0 = getNoteValue('A0');
    const c8 = getNoteValue('C8');
    
    for (let i = 0; i < 100; i++) {
        const pitches = getRandomPitches('treble', 1, 'A0', 'C8', 'treble', 'C', true);
        const val = getNoteValue(pitches[0]);
        expect(val).toBeGreaterThanOrEqual(a0);
        expect(val).toBeLessThanOrEqual(c8);
    }
  });

  it('should favor sharps in sharp keys and flats in flat keys when chromatic is on', () => {
    // Sharp key: G (1 sharp)
    let sharps = 0;
    let flats = 0;
    for (let i = 0; i < 100; i++) {
        const p = getRandomPitches('treble', 1, 'C3', 'C6', 'treble', 'G', true)[0];
        if (p.includes('#')) sharps++;
        if (p.includes('b')) flats++;
    }
    expect(sharps).toBeGreaterThan(flats);

    // Flat key: F (1 flat)
    sharps = 0;
    flats = 0;
    for (let i = 0; i < 100; i++) {
        const p = getRandomPitches('treble', 1, 'C3', 'C6', 'treble', 'F', true)[0];
        if (p.includes('#')) sharps++;
        if (p.includes('b')) flats++;
    }
    expect(flats).toBeGreaterThan(sharps);
  });
});
