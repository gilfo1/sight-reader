import { describe, it, expect } from 'vitest';
import { getRandomPitches } from '../../../src/engine/music-generator';
import { getNoteValue } from '../../../src/utils/theory';

describe('Max Hand Reach Logic', () => {
  it('should respect maxReach of 5 semitones', () => {
    // Generate 2 notes with a reach of 5 semitones
    for (let i = 0; i < 50; i++) {
      const pitches = getRandomPitches('treble', 2, 'C4', 'C6', 'C', false, false, 5);
      if (pitches.length < 2) continue;
      
      const v1 = getNoteValue(pitches[0]);
      const v2 = getNoteValue(pitches[1]);
      const reach = Math.abs(v1 - v2);
      
      expect(reach).toBeLessThan(5);
    }
  });

  it('should respect maxReach of 12 semitones (1 octave)', () => {
    for (let i = 0; i < 50; i++) {
      const pitches = getRandomPitches('treble', 4, 'C4', 'C6', 'C', false, false, 12);
      if (pitches.length < 2) continue;
      
      const vals = pitches.map(getNoteValue);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const reach = maxVal - minVal;
      
      expect(reach).toBeLessThan(12);
    }
  });

  it('should respect maxReach of 19 semitones', () => {
    for (let i = 0; i < 50; i++) {
      const pitches = getRandomPitches('treble', 5, 'C3', 'C7', 'C', false, false, 19);
      if (pitches.length < 2) continue;
      
      const vals = pitches.map(getNoteValue);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const reach = maxVal - minVal;
      
      expect(reach).toBeLessThan(19);
    }
  });

  it('should handle cases where valid pool becomes empty due to reach constraint', () => {
    // If we pick C4 and maxReach is 5 semitones, and we want 10 notes, 
    // it should return as many as it can within the reach, not error out.
    const pitches = getRandomPitches('treble', 10, 'C4', 'C6', 'C', false, false, 5);
    
    const vals = pitches.map(getNoteValue);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const reach = maxVal - minVal;
    
    expect(reach).toBeLessThan(5);
    // There are only 3 notes within 4 semitones of C4 in C Major scale: C4, D4, E4. (F4 is 5 semitones away)
    expect(pitches.length).toBeLessThanOrEqual(3);
  });

  it('should respect maxReach even with adaptive learning enabled', async () => {
    const { stats, resetStats } = await import('../../../src/engine/state');
    stats.troubleNotes['C6'] = 100; // C6 is far from C4
    
    for (let i = 0; i < 20; i++) {
      const pitches = getRandomPitches('treble', 2, 'C4', 'C6', 'C', false, true, 5);
      if (pitches.length < 2) continue;
      
      const vals = pitches.map(getNoteValue);
      const reach = Math.abs(vals[0] - vals[1]);
      expect(reach).toBeLessThan(5);
      // Even though C6 has high weight, it shouldn't be picked if it's too far from the first note
    }
    
    resetStats();
  });

  it('should respect maxReach in chromatic mode', () => {
    // Chromatic mode adds non-diatonic notes
    for (let i = 0; i < 50; i++) {
      const pitches = getRandomPitches('treble', 2, 'C4', 'E4', 'C', true, false, 5);
      if (pitches.length < 2) continue;
      
      const v1 = getNoteValue(pitches[0]);
      const v2 = getNoteValue(pitches[1]);
      const reach = Math.abs(v1 - v2);
      
      expect(reach).toBeLessThan(5);
    }
  });

  it('should respect maxReach with complex key signatures (e.g., F# Major)', () => {
    // F# Major (6 sharps)
    for (let i = 0; i < 50; i++) {
      const pitches = getRandomPitches('treble', 3, 'C4', 'C6', 'F#', false, false, 7);
      if (pitches.length < 2) continue;
      
      const vals = pitches.map(getNoteValue);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const reach = maxVal - minVal;
      
      expect(reach).toBeLessThan(7);
    }
  });
});
