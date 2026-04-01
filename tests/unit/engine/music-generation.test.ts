import { describe, it, expect } from 'vitest';
import { generateRhythmicPattern, getRandomPitches, computeMeasureCounts, generateScoreData } from '@/engine/music-generator';
import { getNoteValue } from '@/utils/theory';
import { DURATION_WEIGHTS } from '@/constants/music';

describe('Music Generator Engine', () => {
  it('should generate valid rhythmic patterns', () => {
    const pattern = generateRhythmicPattern(['q', '8']);
    const weightSum = pattern.reduce((acc, d) => {
      return acc + DURATION_WEIGHTS[d];
    }, 0);
    expect(weightSum).toBe(16); // 4/4 measure
  });

  it('should generate pitches within selected range', () => {
    const pitches = getRandomPitches('treble', 4, 'C4', 'C5', 'C', false);
    const minVal = getNoteValue('C4');
    const maxVal = getNoteValue('C5');
    
    pitches.forEach(p => {
      const v = getNoteValue(p);
      expect(v).toBeGreaterThanOrEqual(minVal);
      expect(v).toBeLessThanOrEqual(maxVal);
    });
  });

  it('should alternate notes in grand staff when 1 note per step is selected', () => {
    const counts0 = computeMeasureCounts('grand', 1, 0, ['q']);
    expect(counts0.trebleCounts[0]).toBe(1);
    expect(counts0.bassCounts[0]).toBe(0);
    
    const counts1 = computeMeasureCounts('grand', 1, 1, ['q']);
    expect(counts1.trebleCounts[0]).toBe(0);
    expect(counts1.bassCounts[0]).toBe(1);
  });

  it('should split notes correctly between staves in grand staff', () => {
    const counts = computeMeasureCounts('grand', 5, 0, ['q']);
    expect(counts.trebleCounts[0]).toBe(3);
    expect(counts.bassCounts[0]).toBe(2);
  });

  it('should generate music data with correct structure', () => {
    const config = {
      measuresPerLine: 4,
      linesCount: 1,
      staffType: 'grand',
      notesPerStep: 1,
      minNote: 'C2',
      maxNote: 'C6',
      maxReach: 12,
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['C'],
      isChromatic: false,
      isAdaptive: false
    };
    
    const data = generateScoreData(config);
    expect(data.length).toBe(4);
    expect(data[0].pattern.length).toBe(4); // 4 quarter notes
    expect(data[0].keySignature).toBe('C');
  });
  it('should sum to 16 for various selections', () => {
    const selections = [['w'], ['h'], ['q'], ['8'], ['16'], ['h', 'q', '8']];
    selections.forEach(sel => {
      for (let i = 0; i < 20; i++) {
        const pattern = generateRhythmicPattern(sel);
        const sum = pattern.reduce((acc, d) => {
          return acc + DURATION_WEIGHTS[d];
        }, 0);
        expect(sum).toBe(16);
      }
    });
  });

  it('should fall back to largest fitting duration if selection is empty', () => {
    const pattern = generateRhythmicPattern([]);
    expect(pattern).toEqual(['w']);
  });

  it('should respect staff split for Grand Staff', () => {
    const treble = getRandomPitches('treble', 1, 'C2', 'C6', 'C', false);
    const bass = getRandomPitches('bass', 1, 'C2', 'C6', 'C', false);
    expect(getNoteValue(treble[0]!)).toBeGreaterThanOrEqual(getNoteValue('C4'));
    expect(getNoteValue(bass[0]!)).toBeLessThan(getNoteValue('C4'));
  });

  it('should generate chromatic notes with correct sharp/flat preference', () => {
    let sharps = 0;
    let flats = 0;
    for (let i = 0; i < 100; i++) {
      const p = getRandomPitches('treble', 1, 'C3', 'C6', 'G', true)[0];
      if (p.includes('#')) sharps++;
      if (p.includes('b')) flats++;
    }
    expect(sharps).toBeGreaterThan(flats);

    sharps = 0;
    flats = 0;
    for (let i = 0; i < 100; i++) {
      const p = getRandomPitches('treble', 1, 'C3', 'C6', 'F', true)[0];
      if (p.includes('#')) sharps++;
      if (p.includes('b')) flats++;
    }
    expect(flats).toBeGreaterThan(sharps);
  });
  it('should randomize key signatures across lines when multiple are selected', () => {
    const config = {
      measuresPerLine: 1,
      linesCount: 10,
      staffType: 'treble',
      notesPerStep: 1,
      minNote: 'C4',
      maxNote: 'C5',
      maxReach: 12,
      selectedNoteValues: ['q'],
      selectedKeySignatures: ['G', 'F'],
      isChromatic: false,
      isAdaptive: false
    };
    
    const data = generateScoreData(config);
    const usedKeys = new Set(data.map(m => m.keySignature));
    
    // With 10 lines and 2 keys, probability of only picking one is (1/2)^9, very low.
    expect(usedKeys.has('G')).toBe(true);
    expect(usedKeys.has('F')).toBe(true);
  });

  it('should handle maxNote < minNote gracefully', () => {
    const pitches = getRandomPitches('treble', 1, 'C5', 'C4', 'C', false);
    expect(pitches).toEqual([]);
  });

  it('should handle empty selectedNoteValues', () => {
    const pattern = generateRhythmicPattern([]);
    expect(pattern).toEqual(['w']);
  });

  it('should handle notesPerStep > 1 for single staff', () => {
    const counts = computeMeasureCounts('treble', 3, 0, ['q']);
    expect(counts.trebleCounts[0]).toBe(3);
    expect(counts.bassCounts[0]).toBe(0);
  });

  it('should respect maxReach in getRandomPitches', () => {
    // Range C4 to C6, but maxReach 2 semitones
    const pitches = getRandomPitches('treble', 3, 'C4', 'C6', 'C', false, false, 2);
    if (pitches.length > 1) {
      const minV = getNoteValue(pitches[0]);
      const maxV = getNoteValue(pitches[pitches.length - 1]);
      expect(maxV - minV).toBeLessThanOrEqual(2);
    }
  });

  it('should return empty if no valid notes in range for clef', () => {
    // Bass clef, range C4-C5 (all >= midC)
    const pitches = getRandomPitches('bass', 1, 'C4', 'C5', 'C', false);
    expect(pitches).toEqual([]);
  });
});
