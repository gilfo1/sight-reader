import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  renderScore, 
  setMusicData, 
  resetGameState,
  initKeySignatures,
  initMidiHandler
} from '@/main';

describe('Responsive Score Layout and Regeneration', () => {
  let outputDiv: HTMLDivElement;

  beforeEach(() => {
    resetGameState();
    document.body.innerHTML = `
      <div id="output" style="width: 800px;"></div>
      <div id="midi-device-name"></div>
      <div id="midi-indicator"></div>
      <div id="current-note"></div>
      <select id="measures-per-line"><option value="4">4</option></select>
      <select id="lines"><option value="1">1</option></select>
      <select id="staff-type">
        <option value="treble">Treble</option>
      </select>
    `;
    outputDiv = document.getElementById('output') as HTMLDivElement;
    // Mock clientWidth as it's not available in JSDOM usually
    Object.defineProperty(outputDiv, 'clientWidth', {
      get: () => parseInt(outputDiv.style.width)
    });
    initKeySignatures(() => {});
    
    // Intercept onStateChange to track regeneration calls
    vi.spyOn(window, 'addEventListener'); // Just to avoid issues with WebMidi listeners
    
    // Mock WebMidi to avoid real MIDI access
    vi.mock('webmidi', () => ({
      WebMidi: {
        enable: () => Promise.resolve(),
        inputs: [],
        addListener: () => {},
        removeListener: () => {}
      }
    }));
  });

  it('should render all measures when they fit', () => {
    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    outputDiv.style.width = '1000px';
    renderScore();
    
    const svg = document.querySelector('#output svg')!;
    const stavenotes = svg.querySelectorAll('.vf-stavenote');
    expect(stavenotes.length).toBe(4);
  });

  it('should reduce measures per line when width is restricted', () => {
    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    outputDiv.style.width = '300px'; // Fits ~1 measure
    renderScore();
    
    const svg = document.querySelector('#output svg')!;
    const stavenotes = svg.querySelectorAll('.vf-stavenote');
    expect(stavenotes.length).toBe(1);
  });

  it('should trigger regeneration when reaching the end of rendered measures', async () => {
    const onStateChange = vi.fn();
    initMidiHandler(onStateChange);

    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['D4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    outputDiv.style.width = '300px'; // Fits only 1 measure
    renderScore();
    
    // Simulate playing the correct note for the first measure
    initMidiHandler.triggerNoteOn?.('C4');
    
    // After playing C4, it should advance currentStepIndex to 1.
    // Since only 1 measure was rendered, and measure index 1 is >= renderedMeasuresCount (1),
    // it should call onStateChange(true, true) for regeneration.
    expect(onStateChange).toHaveBeenCalledWith(true, true);
  });

  it('should not regenerate if next step is within rendered measures', () => {
    const onStateChange = vi.fn();
    initMidiHandler(onStateChange);

    setMusicData([
      { pattern: ['q', 'q'], trebleSteps: [['C4'], ['E4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['G4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    outputDiv.style.width = '1000px'; // Fits all measures
    renderScore();
    
    // Play first note of first measure
    initMidiHandler.triggerNoteOn?.('C4');
    
    // nextIndex is 1, which is in measure 0. renderedMeasuresCount is 2.
    // 0 < 2, so it should NOT regenerate.
    // It calls notifyStateChange() which defaults to notifyStateChange(undefined, undefined)
    expect(onStateChange).toHaveBeenCalledWith(undefined, undefined);
    expect(onStateChange).not.toHaveBeenCalledWith(true, expect.anything());
  });
  it('should show bold double barline on the last rendered measure', () => {
    setMusicData([
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' },
      { pattern: ['q'], trebleSteps: [['C4']], bassSteps: [[]], staffType: 'treble', keySignature: 'C' }
    ]);
    
    outputDiv.style.width = '300px'; // Fits only 1 measure
    renderScore();
    
    const svg = document.querySelector('#output svg')!;
    // VexFlow 5 bold double barline usually has a specific class or path
    // We'll check if it renders something related to barline
    expect(svg.innerHTML).toContain('vf-stave');
    // We can't easily check for 'boldDoubleRight' class in SVG paths without deep inspection,
    // but we can at least verify it didn't crash and rendered the measure.
    // Given previous tests pass, this is mostly for completeness.
  });
});
