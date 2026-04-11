import { Factory, Stave, StaveNote, Voice, type EasyScore } from 'vexflow';
import type { NoteRange, PreviewLayout, StaffType } from '@/ui/note-range-preview';
import {
  getGrandStaffPreviewClef,
  getPreviewStaffNotes,
  getPreviewYForNote,
  NOTE_RANGE_GRAND_HEIGHT,
  NOTE_RANGE_SINGLE_HEIGHT,
  NOTE_RANGE_WIDTH,
} from '@/ui/note-range-preview';

interface PreviewRenderData {
  bassRefs: StaveNote[];
  lowerNoteElement: SVGElement | null;
  previewLayout: PreviewLayout;
  trebleRefs: StaveNote[];
  upperNoteElement: SVGElement | null;
}

interface WidthOverrideVoice extends Voice {
  getWidth: () => number;
}

const NOTE_RANGE_PADDING_X = 16;

function createMiniRendererElementId(): string {
  return `note-range-vf-${Math.random().toString(36).slice(2, 9)}`;
}

function createPreviewNote(score: EasyScore, note: string, clef: 'treble' | 'bass'): StaveNote {
  const noteString = `${note}/w`;
  return score.notes(noteString, { clef, stem: clef === 'treble' ? 'up' : 'down' })[0] as StaveNote;
}

function getStaveMetrics(stave: Stave): { bottomLineY: number; stepPx: number } {
  const options = (stave as unknown as { options?: { spacing_between_lines_px?: number } }).options;
  const spacingBetweenLines = options?.spacing_between_lines_px ?? 10;
  return {
    bottomLineY: stave.getYForLine(4),
    stepPx: spacingBetweenLines / 2,
  };
}

function getRenderedNoteElement(noteRef: StaveNote | null): SVGElement | null {
  const svgElement = (noteRef as (StaveNote & { getSVGElement?: () => SVGElement | undefined }) | null)?.getSVGElement?.();
  return svgElement instanceof SVGElement ? svgElement : null;
}

function getNaturalStepIndex(note: string): number {
  const match = note.match(/^([A-Ga-g])(-?\d+)$/);
  if (!match) {
    return 0;
  }

  const [, letter, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  const stepOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  return (octave * 7) + stepOrder.indexOf(letter.toUpperCase());
}

function createStackedWholeNoteVoices(
  score: EasyScore,
  clef: 'treble' | 'bass',
  notes: string[],
): { noteRefs: StaveNote[]; voices: Voice[] } {
  const noteRefs = notes.map((note) => createPreviewNote(score, note, clef));
  const voices = noteRefs.map((noteRef) => {
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([noteRef]);
    (voice as WidthOverrideVoice).getWidth = (): number => 0;
    return voice;
  });

  return { noteRefs, voices };
}

function createPreviewFactory(rendererHostId: string, rendererHeight: number): { score: EasyScore; system: ReturnType<Factory['System']>; vf: Factory } {
  const vf = new Factory({
    renderer: {
      elementId: rendererHostId,
      height: rendererHeight,
      width: NOTE_RANGE_WIDTH,
    },
  });

  return {
    vf,
    score: vf.EasyScore(),
    system: vf.System({
      width: NOTE_RANGE_WIDTH - (NOTE_RANGE_PADDING_X * 2),
      x: NOTE_RANGE_PADDING_X,
      y: 100,
    }),
  };
}

function setPreviewNoteRefs(stave: Stave, noteRefs: StaveNote[]): void {
  noteRefs.forEach((ref) => {
    (ref as { setStave: (nextStave: Stave) => void }).setStave(stave);
  });
}

function addPreviewStave(
  system: ReturnType<Factory['System']>,
  score: EasyScore,
  clef: 'treble' | 'bass',
  notes: string[],
): StaveNote[] {
  const { noteRefs, voices } = createStackedWholeNoteVoices(score, clef, notes);
  const stave = system.addStave({ voices });
  stave.addClef(clef).addTimeSignature('4/4');
  setPreviewNoteRefs(stave, noteRefs);
  return noteRefs;
}

function getPreviewStaveMetrics(system: ReturnType<Factory['System']>, staffType: StaffType): PreviewLayout['staves'] {
  const stavesList = system.getStaves();
  const staves: PreviewLayout['staves'] = {};

  if (stavesList[0]) {
    staves.treble = getStaveMetrics(stavesList[0]);
  }
  if (staffType === 'grand' && stavesList[1]) {
    staves.bass = getStaveMetrics(stavesList[1]);
  } else if (staffType === 'bass' && stavesList[0]) {
    staves.bass = getStaveMetrics(stavesList[0]);
  }

  return staves;
}

function calibratePreviewMetrics(
  staves: PreviewLayout['staves'],
  clef: 'treble' | 'bass',
  refs: StaveNote[],
): void {
  if (refs.length === 0 || !staves[clef]) {
    return;
  }

  const noteRef = refs[0] as StaveNote & { getYs?: () => number[]; keys: string[] };
  const actualY = noteRef.getYs?.()[0];

  if (typeof actualY !== 'number') {
    return;
  }

  const bottomLineNote = clef === 'treble' ? 'E4' : 'G2';
  const steps = getNaturalStepIndex(noteRef.keys[0]!.replace('/', '')) - getNaturalStepIndex(bottomLineNote);
  staves[clef]!.bottomLineY = actualY + (steps * staves[clef]!.stepPx);
}

function centerPreviewNotes(refs: StaveNote[]): void {
  const targetX = (NOTE_RANGE_WIDTH / 2) - 10;

  refs.forEach((ref) => {
    const currentShift = ref.getXShift();
    const currentAbsoluteX = ref.getAbsoluteX();
    const base = currentAbsoluteX - currentShift;
    ref.setXShift(targetX - base);
  });
}

function createPreviewLayout(staffType: StaffType, range: NoteRange, staves: PreviewLayout['staves']): PreviewLayout {
  const previewLayout: PreviewLayout = {
    lowerHandles: [],
    staves,
    staffType,
    upperHandles: [],
  };

  const setHandle = (bound: 'lower' | 'upper', clef: 'treble' | 'bass', note: string): void => {
    const target = bound === 'lower' ? previewLayout.lowerHandles : previewLayout.upperHandles;
    target.length = 0;
    target.push({
      clef,
      x: NOTE_RANGE_WIDTH / 2,
      y: getPreviewYForNote(clef, note, previewLayout),
      note,
    });
  };

  if (staffType === 'grand') {
    setHandle('lower', getGrandStaffPreviewClef(range.minNote), range.minNote);
    setHandle('upper', getGrandStaffPreviewClef(range.maxNote), range.maxNote);
  } else {
    setHandle('lower', staffType, range.minNote);
    setHandle('upper', staffType, range.maxNote);
  }

  return previewLayout;
}

function getBoundNoteElement(
  staffType: StaffType,
  bound: 'lower' | 'upper',
  range: NoteRange,
  trebleRefs: StaveNote[],
  bassRefs: StaveNote[],
): SVGElement | null {
  if (staffType !== 'grand') {
    const refs = staffType === 'treble' ? trebleRefs : bassRefs;
    const index = bound === 'lower' ? 0 : 1;
    return getRenderedNoteElement(refs[index] ?? refs[0] ?? null);
  }

  if (bound === 'lower') {
    return getRenderedNoteElement(
      getGrandStaffPreviewClef(range.minNote) === 'treble' ? trebleRefs[0] ?? null : bassRefs[0] ?? null,
    );
  }

  const upperClef = getGrandStaffPreviewClef(range.maxNote);
  const lowerClef = getGrandStaffPreviewClef(range.minNote);
  const refs = upperClef === 'treble' ? trebleRefs : bassRefs;
  const index = upperClef === lowerClef ? 1 : 0;
  return getRenderedNoteElement(refs[index] ?? null);
}

export function buildPreviewRenderData(visual: HTMLElement, staffType: StaffType, range: NoteRange): PreviewRenderData {
  const rendererHost = document.createElement('div');
  rendererHost.className = 'note-range-renderer';
  rendererHost.id = createMiniRendererElementId();
  visual.appendChild(rendererHost);

  const rendererHeight = staffType === 'grand' ? NOTE_RANGE_GRAND_HEIGHT : NOTE_RANGE_SINGLE_HEIGHT;
  const { vf, score, system } = createPreviewFactory(rendererHost.id, rendererHeight);
  const previewStaffNotes = getPreviewStaffNotes(staffType, range);

  let trebleRefs: StaveNote[] = [];
  let bassRefs: StaveNote[] = [];

  if (staffType === 'grand') {
    trebleRefs = addPreviewStave(system, score, 'treble', previewStaffNotes.treble);
    bassRefs = addPreviewStave(system, score, 'bass', previewStaffNotes.bass);
    system.addConnector('brace');
  } else {
    const refs = addPreviewStave(system, score, staffType, previewStaffNotes[staffType]);
    if (staffType === 'treble') {
      trebleRefs = refs;
    } else {
      bassRefs = refs;
    }
  }

  system.addConnector('singleLeft');
  system.addConnector('singleRight');
  system.format();

  const staves = getPreviewStaveMetrics(system, staffType);
  calibratePreviewMetrics(staves, 'treble', trebleRefs);
  calibratePreviewMetrics(staves, 'bass', bassRefs);
  centerPreviewNotes(trebleRefs);
  centerPreviewNotes(bassRefs);
  vf.draw();

  const previewLayout = createPreviewLayout(staffType, range, staves);

  return {
    bassRefs,
    previewLayout,
    trebleRefs,
    lowerNoteElement: getBoundNoteElement(staffType, 'lower', range, trebleRefs, bassRefs),
    upperNoteElement: getBoundNoteElement(staffType, 'upper', range, trebleRefs, bassRefs),
  };
}
