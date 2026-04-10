import { Factory, Stave, StaveNote, Voice, type EasyScore } from 'vexflow';
import { ALL_PIANO_NOTES } from '@/constants/music';
import { getElementById } from '@/ui/dom';
import { saveToStorage, loadFromStorage } from '@/utils/storage';
import { getNoteValue } from '@/utils/theory';

const STAFF_NOTE_RANGE_STORAGE_KEY = 'staff-note-ranges';
const NATURAL_PIANO_NOTES = ALL_PIANO_NOTES.filter((note) => !note.includes('#'));
const NOTE_RANGE_WIDTH = 244;
const NOTE_RANGE_PADDING_X = 16;
const NOTE_RANGE_SINGLE_HEIGHT = 220;
const NOTE_RANGE_GRAND_HEIGHT = 280;

export type StaffType = 'grand' | 'treble' | 'bass';
export type NoteRangeBound = 'lower' | 'upper';

interface NoteRange {
  minNote: string;
  maxNote: string;
}

interface StaffNoteRanges {
  bass: NoteRange;
  grand: NoteRange;
  treble: NoteRange;
}

interface PreviewLayout {
  lowerHandles: Array<{ clef: 'treble' | 'bass'; x: number; y: number }>;
  staves: Partial<Record<'treble' | 'bass', { bottomLineY: number; stepPx: number }>>;
  staffType: StaffType;
  upperHandles: Array<{ clef: 'treble' | 'bass'; x: number; y: number }>;
}

interface WidthOverrideVoice extends Voice {
  getWidth: () => number;
}

interface PreviewStaffNotes {
  bass: string[];
  treble: string[];
}

const STAFF_LABELS: Record<StaffType, string> = {
  bass: 'Bass clef',
  grand: 'Grand staff',
  treble: 'Treble clef',
};

const DEFAULT_STAFF_RANGES: StaffNoteRanges = {
  bass: { minNote: 'C1', maxNote: 'C5' },
  grand: { minNote: 'C2', maxNote: 'C6' },
  treble: { minNote: 'C3', maxNote: 'C6' },
};

const GRAND_STAFF_CLEF_SPLIT_NOTE = 'C4';

const ui = {
  get maxNote() { return getElementById<HTMLInputElement>('max-note'); },
  get minNote() { return getElementById<HTMLInputElement>('min-note'); },
  get selectedStaffLabel() { return getElementById<HTMLElement>('note-range-selected-staff'); },
  get selector() { return getElementById<HTMLElement>('note-range-selector'); },
  get staffType() { return getElementById<HTMLSelectElement>('staff-type'); },
  get summary() { return getElementById<HTMLElement>('note-range-value-summary'); },
  get visual() { return getElementById<HTMLElement>('note-range-visual'); },
};

let activeDragTarget: { bound: NoteRangeBound; clef: 'treble' | 'bass' } | null = null;
let currentPreviewLayout: PreviewLayout | null = null;

function getNormalizedStaffType(value: string | null | undefined): StaffType {
  if (value === 'treble' || value === 'bass') {
    return value;
  }

  return 'grand';
}

function getCurrentStaffType(): StaffType {
  return getNormalizedStaffType(ui.staffType?.value);
}

function getGrandStaffPreviewClef(note: string): 'treble' | 'bass' {
  return getNoteValue(note) < getNoteValue(GRAND_STAFF_CLEF_SPLIT_NOTE) ? 'bass' : 'treble';
}

function getDefaultRangeForStaff(staffType: StaffType): NoteRange {
  return { ...DEFAULT_STAFF_RANGES[staffType] };
}

function getDefaultStaffRanges(): StaffNoteRanges {
  return {
    bass: getDefaultRangeForStaff('bass'),
    grand: getDefaultRangeForStaff('grand'),
    treble: getDefaultRangeForStaff('treble'),
  };
}

function createMiniRendererElementId(): string {
  return `note-range-vf-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAvailableRangeForStaff(staffType: StaffType): string[] {
  if (staffType === 'treble') {
    return NATURAL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue('C3') && getNoteValue(note) <= getNoteValue('C6'));
  }

  if (staffType === 'bass') {
    return NATURAL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue('C1') && getNoteValue(note) <= getNoteValue('C5'));
  }

  return NATURAL_PIANO_NOTES;
}

export function clampNoteRangeForStaff(staffType: StaffType, range: Partial<NoteRange>): NoteRange {
  const availableNotes = getAvailableRangeForStaff(staffType);
  const defaults = getDefaultRangeForStaff(staffType);
  let minNote = availableNotes.includes(range.minNote ?? '') ? range.minNote! : defaults.minNote;
  let maxNote = availableNotes.includes(range.maxNote ?? '') ? range.maxNote! : defaults.maxNote;

  if (getNoteValue(minNote) > getNoteValue(maxNote)) {
    const minIndex = availableNotes.indexOf(minNote);
    const maxIndex = availableNotes.indexOf(maxNote);
    minNote = availableNotes[Math.min(minIndex, maxIndex)] ?? minNote;
    maxNote = availableNotes[Math.max(minIndex, maxIndex)] ?? maxNote;
  }

  return { minNote, maxNote };
}

export function noteRequiresLedgerLines(clef: 'treble' | 'bass', note: string): boolean {
  const noteStep = getNaturalStepIndex(note);
  const lowestStaffStep = clef === 'treble' ? getNaturalStepIndex('E4') : getNaturalStepIndex('G2');
  const highestStaffStep = clef === 'treble' ? getNaturalStepIndex('F5') : getNaturalStepIndex('A3');
  return noteStep < lowestStaffStep || noteStep > highestStaffStep;
}

export function getPreviewStaffNotes(staffType: StaffType, range: NoteRange): PreviewStaffNotes {
  if (staffType === 'treble') {
    return { bass: [], treble: [range.minNote, range.maxNote] };
  }

  if (staffType === 'bass') {
    return { bass: [range.minNote, range.maxNote], treble: [] };
  }

  const staffNotes: PreviewStaffNotes = { bass: [], treble: [] };
  const lowerClef = getGrandStaffPreviewClef(range.minNote);
  const upperClef = getGrandStaffPreviewClef(range.maxNote);

  staffNotes[lowerClef].push(range.minNote);
  staffNotes[upperClef].push(range.maxNote);

  return staffNotes;
}

export function getStoredStaffNoteRanges(): StaffNoteRanges {
  const stored = loadFromStorage<Partial<StaffNoteRanges>>(STAFF_NOTE_RANGE_STORAGE_KEY);
  const defaults = getDefaultStaffRanges();

  return {
    bass: clampNoteRangeForStaff('bass', stored?.bass ?? defaults.bass),
    grand: clampNoteRangeForStaff('grand', stored?.grand ?? defaults.grand),
    treble: clampNoteRangeForStaff('treble', stored?.treble ?? defaults.treble),
  };
}

function saveStoredStaffNoteRanges(ranges: StaffNoteRanges): void {
  saveToStorage(STAFF_NOTE_RANGE_STORAGE_KEY, ranges);
}

function dispatchRangeChange(): void {
  ui.selector?.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncHiddenInputs(range: NoteRange): void {
  if (ui.minNote) {
    ui.minNote.value = range.minNote;
  }

  if (ui.maxNote) {
    ui.maxNote.value = range.maxNote;
  }
}

function getSummaryText(range: NoteRange): string {
  return `${range.minNote.toLowerCase()} - ${range.maxNote.toLowerCase()}`;
}

function renderSummary(range: NoteRange): void {
  if (ui.summary) {
    ui.summary.textContent = getSummaryText(range);
  }
}

function getNaturalStepIndex(note: string): number {
  const match = note.match(/^([A-G])(-?\d+)$/);
  if (!match) {
    return 0;
  }

  const [, letter, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  const stepOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  return (octave * 7) + stepOrder.indexOf(letter);
}

function getPreviewYForNote(clef: 'treble' | 'bass', note: string, previewLayout: PreviewLayout): number {
  const stave = previewLayout.staves[clef] ?? previewLayout.staves.treble ?? previewLayout.staves.bass;

  if (!stave) {
    return 0;
  }

  const { bottomLineY, stepPx } = stave;
  const anchorIndex = clef === 'treble' ? getNaturalStepIndex('E4') : getNaturalStepIndex('G2');
  return bottomLineY - ((getNaturalStepIndex(note) - anchorIndex) * stepPx);
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

function getNoteCenterX(noteRef: StaveNote | null): number {
  if (!noteRef) {
    return NOTE_RANGE_WIDTH / 2;
  }

  const metrics = noteRef.getMetrics();
  const noteWidth = metrics?.notePx ?? noteRef.getGlyphWidth() ?? 16;
  return noteRef.getAbsoluteX() + (noteWidth / 2);
}

function getNoteCenterY(noteRef: StaveNote | null): number {
  const boundingBox = noteRef?.getBoundingBox();

  if (!boundingBox) {
    return 0;
  }

  return boundingBox.getY() + (boundingBox.getH() / 2);
}

function createStackedWholeNoteVoices(
  score: EasyScore,
  clef: 'treble' | 'bass',
  notes: string[],
): { noteRefs: StaveNote[]; voices: Voice[] } {
  const noteRefs = notes.map((note) => createPreviewNote(score, note, clef));
  const voices = noteRefs.map((noteRef, index) => {
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables([noteRef]);

    if (index > 0) {
      const anchorRef = noteRefs[0]!;
      const originalDraw = noteRef.draw.bind(noteRef);
      noteRef.draw = function draw(): void {
        if (anchorRef.getTickContext() && noteRef.getTickContext()) {
          noteRef.setXShift(anchorRef.getAbsoluteX() - noteRef.getAbsoluteX());
        }
        originalDraw();
      };
      (voice as WidthOverrideVoice).getWidth = (): number => 0;
    }

    return voice;
  });

  return { noteRefs, voices };
}

function renderVexFlowPreview(staffType: StaffType, range: NoteRange): void {
  const visual = ui.visual;

  if (!visual) {
    return;
  }

  visual.innerHTML = '';
  visual.dataset.staffType = staffType;

  const rendererHost = document.createElement('div');
  rendererHost.className = 'note-range-renderer';
  rendererHost.id = createMiniRendererElementId();
  visual.appendChild(rendererHost);

  const rendererHeight = staffType === 'grand' ? NOTE_RANGE_GRAND_HEIGHT : NOTE_RANGE_SINGLE_HEIGHT;
  const vf = new Factory({
    renderer: {
      elementId: rendererHost.id,
      height: rendererHeight,
      width: NOTE_RANGE_WIDTH,
    },
  });
  const score = vf.EasyScore();
  const system = vf.System({
    width: NOTE_RANGE_WIDTH - (NOTE_RANGE_PADDING_X * 2),
    x: NOTE_RANGE_PADDING_X,
    y: staffType === 'grand' ? 26 : 32,
  });

  let trebleRefs: StaveNote[] = [];
  let bassRefs: StaveNote[] = [];
  const staves: PreviewLayout['staves'] = {};
  const previewStaffNotes = getPreviewStaffNotes(staffType, range);

  const addRenderedStave = (clef: 'treble' | 'bass'): void => {
    const staffNotes = clef === 'treble' ? previewStaffNotes.treble : previewStaffNotes.bass;
    const { noteRefs, voices } = createStackedWholeNoteVoices(score, clef, staffNotes);
    const stave = system.addStave({ voices });
    stave.addClef(clef).addTimeSignature('4/4');

    if (clef === 'treble') {
      trebleRefs = noteRefs;
      staves.treble = getStaveMetrics(stave);
    } else {
      bassRefs = noteRefs;
      staves.bass = getStaveMetrics(stave);
    }
  };

  if (staffType === 'grand') {
    addRenderedStave('treble');
    addRenderedStave('bass');
    system.addConnector('brace');
  }
  if (staffType !== 'grand') {
    addRenderedStave(staffType);
  }

  system.addConnector('singleLeft');
  system.addConnector('singleRight');
  system.format();
  vf.draw();

  const previewLayout: PreviewLayout = {
    lowerHandles: [],
    staves,
    staffType,
    upperHandles: [],
  };

  const addHandle = (bound: NoteRangeBound, clef: 'treble' | 'bass', noteRef: StaveNote | null, note: string): void => {
    const target = bound === 'lower' ? previewLayout.lowerHandles : previewLayout.upperHandles;
    target.push({
      clef,
      x: getNoteCenterX(noteRef),
      y: getNoteCenterY(noteRef) || getPreviewYForNote(clef, note, previewLayout),
    });
  };

  if (staffType === 'grand') {
    addHandle('lower', getGrandStaffPreviewClef(range.minNote), getGrandStaffPreviewClef(range.minNote) === 'treble' ? trebleRefs[0] ?? null : bassRefs[0] ?? null, range.minNote);

    const upperClef = getGrandStaffPreviewClef(range.maxNote);
    const upperRefs = upperClef === 'treble' ? trebleRefs : bassRefs;
    const upperIndex = upperClef === getGrandStaffPreviewClef(range.minNote) ? 1 : 0;
    addHandle('upper', upperClef, upperRefs[upperIndex] ?? upperRefs[0] ?? null, range.maxNote);
  } else {
    const noteRefs = staffType === 'treble' ? trebleRefs : bassRefs;
    addHandle('lower', staffType, noteRefs[0] ?? null, range.minNote);
    addHandle('upper', staffType, noteRefs[1] ?? noteRefs[0] ?? null, range.maxNote);
  }

  currentPreviewLayout = previewLayout;

  const overlay = document.createElement('div');
  overlay.className = 'note-range-overlay';
  overlay.dataset.staffType = staffType;

  const createHandle = (bound: NoteRangeBound, handleLayout: { clef: 'treble' | 'bass'; x: number; y: number }, note: string): HTMLButtonElement => {
    const handle = document.createElement('button');

    handle.type = 'button';
    handle.className = `note-range-handle note-range-handle-${bound}`;
    handle.dataset.bound = bound;
    handle.dataset.clef = handleLayout.clef;
    handle.dataset.note = note;
    handle.setAttribute('aria-label', `${bound === 'lower' ? 'Lower' : 'Upper'} note ${note}`);
    handle.style.left = `${handleLayout.x}px`;
    handle.style.top = `${handleLayout.y}px`;

    handle.addEventListener('mousedown', (event) => {
      event.preventDefault();
      activeDragTarget = { bound, clef: handleLayout.clef };
    });

    return handle;
  };

  previewLayout.lowerHandles.forEach((handleLayout) => {
    overlay.appendChild(createHandle('lower', handleLayout, range.minNote));
  });
  previewLayout.upperHandles.forEach((handleLayout) => {
    overlay.appendChild(createHandle('upper', handleLayout, range.maxNote));
  });
  visual.appendChild(overlay);
}

function updateRangeUI(staffType: StaffType, range: NoteRange): void {
  syncHiddenInputs(range);
  renderVexFlowPreview(staffType, range);
  renderSummary(range);

  if (ui.selectedStaffLabel) {
    ui.selectedStaffLabel.textContent = `${STAFF_LABELS[staffType]} range`;
  }
}

function findClosestNoteForClientY(staffType: StaffType, clef: 'treble' | 'bass', clientY: number): string {
  const notes = getAvailableRangeForStaff(staffType);
  const rect = ui.visual?.getBoundingClientRect();
  const top = rect && rect.height > 0 ? rect.top : 0;
  const targetY = clientY - top;
  const previewLayout = currentPreviewLayout;

  if (!previewLayout || !previewLayout.staves[clef]) {
    return notes[0]!;
  }

  return notes.reduce((closest, note) => {
    const bestDistance = Math.abs(getPreviewYForNote(clef, closest, previewLayout) - targetY);
    const noteDistance = Math.abs(getPreviewYForNote(clef, note, previewLayout) - targetY);
    return noteDistance < bestDistance ? note : closest;
  }, notes[0]!);
}

function bindPointerListeners(): void {
  window.onmousemove = (event: MouseEvent) => {
    if (!activeDragTarget) {
      return;
    }

    const staffType = getCurrentStaffType();
    const draggedNote = findClosestNoteForClientY(staffType, activeDragTarget.clef, event.clientY);
    const currentRange = clampNoteRangeForStaff(staffType, {
      minNote: ui.minNote?.value,
      maxNote: ui.maxNote?.value,
    });

    setCurrentStaffNoteRange(
      activeDragTarget.bound === 'lower'
        ? { minNote: draggedNote, maxNote: currentRange.maxNote }
        : { minNote: currentRange.minNote, maxNote: draggedNote },
      true,
    );
  };

  window.onmouseup = () => {
    activeDragTarget = null;
  };
}

export function setNoteRangeForStaff(staffType: StaffType, range: Partial<NoteRange>): void {
  const storedRanges = getStoredStaffNoteRanges();
  storedRanges[staffType] = clampNoteRangeForStaff(staffType, range);
  saveStoredStaffNoteRanges(storedRanges);

  if (staffType === getCurrentStaffType()) {
    updateRangeUI(staffType, storedRanges[staffType]);
  }
}

export function setCurrentStaffNoteRange(range: Partial<NoteRange>, notifyChange = false): void {
  const staffType = getCurrentStaffType();
  const nextRange = clampNoteRangeForStaff(staffType, range);
  const storedRanges = getStoredStaffNoteRanges();

  storedRanges[staffType] = nextRange;
  saveStoredStaffNoteRanges(storedRanges);
  updateRangeUI(staffType, nextRange);

  if (notifyChange) {
    dispatchRangeChange();
  }
}

export function updateNoteRangeSelector(): void {
  bindPointerListeners();
  const staffType = getCurrentStaffType();
  updateRangeUI(staffType, getStoredStaffNoteRanges()[staffType]);
}
