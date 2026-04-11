import { Factory, Stave, StaveNote, Voice, type EasyScore } from 'vexflow';
import { ALL_PIANO_NOTES } from '@/constants/music';
import { getElementById } from '@/ui/dom';
import { saveToStorage, loadFromStorage } from '@/utils/storage';
import { getNoteValue } from '@/utils/theory';

const STAFF_NOTE_RANGE_STORAGE_KEY = 'staff-note-ranges';
const NATURAL_PIANO_NOTES = ALL_PIANO_NOTES.filter((note) => !note.includes('#'));
const NOTE_RANGE_WIDTH = 244;
const NOTE_RANGE_PADDING_X = 16;
const NOTE_RANGE_SINGLE_HEIGHT = 380;
const NOTE_RANGE_GRAND_HEIGHT = 380;
const NOTE_RANGE_HOVER_COLOR = '#255b78';

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
  lowerHandles: Array<{ clef: 'treble' | 'bass'; x: number; y: number; note: string }>;
  staves: Partial<Record<'treble' | 'bass', { bottomLineY: number; stepPx: number }>>;
  staffType: StaffType;
  upperHandles: Array<{ clef: 'treble' | 'bass'; x: number; y: number; note: string }>;
}

interface CachedPreview {
  html: string;
  lowerNoteIndex: number;
  previewLayout: PreviewLayout;
  upperNoteIndex: number;
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

const GRAND_STAFF_VISUAL_SPLIT_NOTE = 'C4';
const GRAND_STAFF_LOGICAL_SPLIT_NOTE = 'C4';

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
let dragYOffset = 0;
let currentPreviewLayout: PreviewLayout | null = null;
let dragListenersBound = false;
let dragRangeDraft: NoteRange | null = null;
let dragStaffType: StaffType | null = null;
let dragVisualTop = 0;
let availableNotesCache: string[] | null = null;
let lastStaffTypeForCache: StaffType | null = null;
const previewCache = new Map<string, CachedPreview>();
const MAX_PREVIEW_CACHE_ENTRIES = 24;

const handleMove = (event: MouseEvent | PointerEvent | TouchEvent): void => {
  if (!activeDragTarget) {
    return;
  }

  const clientY = 'touches' in event ? (event.touches[0]?.clientY ?? 0) : (event as MouseEvent).clientY;
  const staffType = dragStaffType ?? getCurrentStaffType();
  
  // Update handle position in DOM immediately for smooth visual feedback
  const visual = ui.visual;

  // Adjust targetY by the initial drag offset to find the closest note
  const targetYWithOffset = Math.round(clientY - dragYOffset);
    
  // On grand staff, the clef might change during drag if we don't fix it to the active target's clef.
  // However, findClosestNoteForClientY already filters notes by the target's clef.
  const draggedNote = findClosestNoteForClientY(staffType, activeDragTarget.clef, targetYWithOffset, activeDragTarget.bound);
  
  // Snap visual handle to the actual note position
  if (currentPreviewLayout) {
    const noteY = getPreviewYForNote(activeDragTarget.clef, draggedNote, currentPreviewLayout);
    const handle = visual?.querySelector(`.note-range-handle-${activeDragTarget.bound}`) as HTMLElement;
    if (handle) {
      handle.style.top = `${noteY}px`;
    }
  }

  const currentRange = getCurrentRangeForStaff(staffType);
  const nextRange = clampNoteRangeForStaff(
    staffType,
    activeDragTarget.bound === 'lower'
      ? { minNote: draggedNote, maxNote: currentRange.maxNote }
      : { minNote: currentRange.minNote, maxNote: draggedNote },
  );

  dragRangeDraft = nextRange;
  setCurrentStaffNoteRange(nextRange, false, true, false);
};

const handleUp = (_event: MouseEvent | PointerEvent | TouchEvent): void => {
  // If it's a touch event, it might not have coordinates on touchend/touchcancel
  // but we just want to stop dragging.
  stopDragging();
};

function stopDragging(): void {
  const draftRange = dragRangeDraft;
  const staffType = dragStaffType;
  const hadActiveDrag = activeDragTarget !== null;

  activeDragTarget = null;
  dragRangeDraft = null;
  dragStaffType = null;
  dragVisualTop = 0;
  unbindDragListeners();

  const visual = ui.visual;
  visual?.classList.remove('note-range-visual-dragging');

  if (!hadActiveDrag || !staffType) {
    return;
  }

  const storedRanges = getStoredStaffNoteRanges();
  const previousRange = storedRanges[staffType];
  const finalRange = draftRange ?? previousRange;

  storedRanges[staffType] = finalRange;
  saveStoredStaffNoteRanges(storedRanges);
  updateRangeUI(staffType, finalRange);

  if (previousRange.minNote !== finalRange.minNote || previousRange.maxNote !== finalRange.maxNote) {
    dispatchRangeChange();
  }
}

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
  return getNoteValue(note) < getNoteValue(GRAND_STAFF_VISUAL_SPLIT_NOTE) ? 'bass' : 'treble';
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
  if (availableNotesCache && lastStaffTypeForCache === staffType) {
    return availableNotesCache;
  }

  // Common limits for all staff types to prevent notes from going too far off screen
  // Highest: C8 (top of 88-key piano)
  // Lowest: A0 (bottom of 88-key piano)
  const GLOBAL_MIN = 'A0';
  const GLOBAL_MAX = 'C8';

  let result: string[];
  if (staffType === 'treble') {
    result = NATURAL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue('C3') && getNoteValue(note) <= getNoteValue(GLOBAL_MAX));
  } else if (staffType === 'bass') {
    result = NATURAL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue(GLOBAL_MIN) && getNoteValue(note) <= getNoteValue('C5'));
  } else {
    // Grand staff: combine the limits
    result = NATURAL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue(GLOBAL_MIN) && getNoteValue(note) <= getNoteValue(GLOBAL_MAX));
  }

  availableNotesCache = result;
  lastStaffTypeForCache = staffType;
  return result;
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

function getCurrentRangeForStaff(staffType: StaffType): NoteRange {
  if (dragStaffType === staffType && dragRangeDraft) {
    return dragRangeDraft;
  }

  return getStoredStaffNoteRanges()[staffType];
}

function getPreviewCacheKey(staffType: StaffType, range: NoteRange): string {
  return `${staffType}:${range.minNote}:${range.maxNote}`;
}

function getRenderedNoteIndex(noteElement: SVGElement | null, visual: HTMLElement): number {
  if (!noteElement) {
    return -1;
  }

  return Array.from(visual.querySelectorAll<SVGElement>('.vf-stavenote')).indexOf(noteElement);
}

function getCachedRenderedNote(visual: HTMLElement, index: number): SVGElement | null {
  if (index < 0) {
    return null;
  }

  return visual.querySelectorAll<SVGElement>('.vf-stavenote')[index] ?? null;
}

function storePreviewCache(key: string, entry: CachedPreview): void {
  previewCache.delete(key);
  previewCache.set(key, entry);

  if (previewCache.size <= MAX_PREVIEW_CACHE_ENTRIES) {
    return;
  }

  const oldestKey = previewCache.keys().next().value;
  if (oldestKey) {
    previewCache.delete(oldestKey);
  }
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
  const match = note.match(/^([A-Ga-g])(-?\d+)$/);
  if (!match) {
    return 0;
  }

  const [, letter, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  const stepOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  return (octave * 7) + stepOrder.indexOf(letter.toUpperCase());
}

function getPreviewYForNote(clef: 'treble' | 'bass', note: string, previewLayout: PreviewLayout): number {
  const stave = previewLayout.staves[clef];

  if (!stave) {
    return 0;
  }

  const { bottomLineY, stepPx } = stave;
  const bottomLineNote = clef === 'treble' ? 'E4' : 'G2';
  const bottomLineIndex = getNaturalStepIndex(bottomLineNote);
  const noteIndex = getNaturalStepIndex(note);
  const steps = noteIndex - bottomLineIndex;
  
  return bottomLineY - (steps * stepPx);
}

function createPreviewNote(score: EasyScore, note: string, clef: 'treble' | 'bass'): StaveNote {
  const noteString = `${note}/w`;
  return score.notes(noteString, { clef, stem: clef === 'treble' ? 'up' : 'down' })[0] as StaveNote;
}

function getStaveMetrics(stave: Stave): { bottomLineY: number; stepPx: number } {
  const options = (stave as unknown as { options?: { spacing_between_lines_px?: number } }).options;
  const spacingBetweenLines = options?.spacing_between_lines_px ?? 10;
  // bottomLineY is absolute relative to the SVG/renderer origin
  const bottomLineY = stave.getYForLine(4);
  
  return {
    bottomLineY,
    stepPx: spacingBetweenLines / 2,
  };
}


function getRenderedNoteElement(noteRef: StaveNote | null): SVGElement | null {
  const svgElement = (noteRef as (StaveNote & { getSVGElement?: (suffix?: string) => SVGElement | undefined }) | null)?.getSVGElement?.();

  if (svgElement instanceof SVGElement) {
    return svgElement;
  }

  return null;
}

function setRenderedNoteHoverState(noteElement: SVGElement | null, isHovered: boolean): void {
  if (!noteElement) {
    return;
  }

  noteElement.classList.toggle('note-range-note-hovered', isHovered);
  noteElement.setAttribute('data-note-range-hovered', String(isHovered));

  const drawableElements = noteElement.querySelectorAll<SVGElement>('path, ellipse, line, polygon, rect');

  // Helper to highlight an element and its siblings if they look like ledger lines
  const highlightElements = (el: SVGElement, hovered: boolean): void => {
    if (hovered) {
      const elHtml = el as unknown as HTMLElement;
      if (elHtml.dataset.noteRangeOriginalStroke === undefined) {
        elHtml.dataset.noteRangeOriginalStroke = el.getAttribute('stroke') ?? '';
      }
      if (elHtml.dataset.noteRangeOriginalFill === undefined) {
        elHtml.dataset.noteRangeOriginalFill = el.getAttribute('fill') ?? '';
      }
      el.setAttribute('stroke', NOTE_RANGE_HOVER_COLOR);
      el.setAttribute('fill', NOTE_RANGE_HOVER_COLOR);
    } else {
      const elHtml = el as unknown as HTMLElement;
      const originalStroke = elHtml.dataset.noteRangeOriginalStroke ?? '';
      const originalFill = elHtml.dataset.noteRangeOriginalFill ?? '';
      if (originalStroke) el.setAttribute('stroke', originalStroke);
      else el.removeAttribute('stroke');
      if (originalFill) el.setAttribute('fill', originalFill);
      else el.removeAttribute('fill');
    }
  };

  // VexFlow 4+ often renders notes as <g class="vf-stavenote">
  // Ledger lines might be in the same group or siblings.
  if (noteElement.tagName.toLowerCase() === 'g') {
    // 1. Highlight all children
    drawableElements.forEach((el) => highlightElements(el, isHovered));

    // 2. Look for siblings that might be ledger lines (usually paths or rects)
    // We only want to highlight siblings if the note actually needs ledger lines.
    // However, we don't have easy access to the note name here.
    // Let's check if the sibling is close enough vertically to the note.
    const noteGraphicsElement = noteElement as unknown as SVGGraphicsElement;
    const noteBox = (noteElement as unknown as { getBoundingBox?: () => { y: number; height: number } }).getBoundingBox 
      ? (noteElement as unknown as { getBoundingBox: () => { y: number; height: number } }).getBoundingBox() 
      : (noteGraphicsElement.getBBox ? noteGraphicsElement.getBBox() : { y: 0, height: 0 });
    const noteCenterY = noteBox.y + noteBox.height / 2;

    let sibling = noteElement.nextElementSibling;
    while (sibling && (sibling.tagName.toLowerCase() === 'path' || sibling.tagName.toLowerCase() === 'rect')) {
      if (sibling.classList.contains('vf-stavenote')) break;
      const siblingBox = (sibling as SVGGraphicsElement).getBBox ? (sibling as SVGGraphicsElement).getBBox() : { y: 0, height: 0 };
      const siblingCenterY = siblingBox.y + siblingBox.height / 2;
      // Ledger lines should be within ~35px of the note head (3-4 ledger lines distance)
      if (Math.abs(siblingCenterY - noteCenterY) < 35) {
        highlightElements(sibling as SVGElement, isHovered);
      }
      sibling = sibling.nextElementSibling;
    }

    let prevSibling = noteElement.previousElementSibling;
    while (prevSibling && (prevSibling.tagName.toLowerCase() === 'path' || prevSibling.tagName.toLowerCase() === 'rect')) {
      if (prevSibling.classList.contains('vf-stavenote')) break;
      const siblingBox = (prevSibling as SVGGraphicsElement).getBBox ? (prevSibling as SVGGraphicsElement).getBBox() : { y: 0, height: 0 };
      const siblingCenterY = siblingBox.y + siblingBox.height / 2;
      if (Math.abs(siblingCenterY - noteCenterY) < 35) {
        highlightElements(prevSibling as SVGElement, isHovered);
      }
      prevSibling = prevSibling.previousElementSibling;
    }
  } else {
    highlightElements(noteElement, isHovered);
    drawableElements.forEach((el) => highlightElements(el, isHovered));
  }
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

function renderVexFlowPreview(staffType: StaffType, range: NoteRange): void {
  const visual = ui.visual;

  if (!visual) {
    return;
  }

  const cacheKey = getPreviewCacheKey(staffType, range);
  const cachedPreview = previewCache.get(cacheKey);

  if (cachedPreview) {
    visual.innerHTML = cachedPreview.html;
    visual.dataset.staffType = staffType;
    currentPreviewLayout = cachedPreview.previewLayout;

    const lowerNoteElement = getCachedRenderedNote(visual, cachedPreview.lowerNoteIndex);
    const upperNoteElement = getCachedRenderedNote(visual, cachedPreview.upperNoteIndex);
    renderPreviewOverlay(staffType, range, lowerNoteElement, upperNoteElement);
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
    y: 100,
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
    } else {
      bassRefs = noteRefs;
    }
    
    // Explicitly associate noteRefs with the stave if they didn't have it
    noteRefs.forEach(ref => {
      (ref as any).setStave(stave);
    });
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

  // Extract initial metrics
  const stavesList = system.getStaves();
  if (stavesList[0]) {
    staves.treble = getStaveMetrics(stavesList[0]);
  }
  if (staffType === 'grand' && stavesList[1]) {
    staves.bass = getStaveMetrics(stavesList[1]);
  } else if (staffType === 'bass' && stavesList[0]) {
    staves.bass = getStaveMetrics(stavesList[0]);
  }

  // Refine metrics using actual note positions if available
  const calibrateFromNotes = (clef: 'treble' | 'bass', refs: StaveNote[]): void => {
    if (refs.length === 0) return;

    const noteRef = refs[0];
    const noteName = (noteRef as any).keys[0].replace('/', '');
    
    // getYs() returns relative to stave in some cases, absolute in others.
    // In VexFlow 5 with System, it's usually absolute after format.
    const actualY = (noteRef as any).getYs ? (noteRef as any).getYs()[0] : null;
    
    if (typeof actualY === 'number' && staves[clef]) {
      const stepPx = staves[clef]!.stepPx;
      const bottomLineNote = clef === 'treble' ? 'E4' : 'G2';
      const bottomLineIndex = getNaturalStepIndex(bottomLineNote);
      const noteIndex = getNaturalStepIndex(noteName);
      const steps = noteIndex - bottomLineIndex;
      
      staves[clef]!.bottomLineY = actualY + (steps * stepPx);
    }
  };

  calibrateFromNotes('treble', trebleRefs);
  calibrateFromNotes('bass', bassRefs);

  // Center each note individually in the stave
  const centerNotes = (refs: StaveNote[]): void => {
    const targetX = (NOTE_RANGE_WIDTH / 2) - 10; // Center minus half of whole note head width
    refs.forEach(ref => {
      // In VexFlow, getAbsoluteX() includes current x_shift.
      // We want newAbsoluteX = targetX.
      // currentAbsoluteX = base + currentShift.
      // So base = currentAbsoluteX - currentShift.
      // newShift = targetX - base = targetX - (currentAbsoluteX - currentShift).
      const currentShift = ref.getXShift();
      const currentAbsoluteX = ref.getAbsoluteX();
      const base = currentAbsoluteX - currentShift;
      ref.setXShift(targetX - base);
    });
  };
  centerNotes(trebleRefs);
  centerNotes(bassRefs);

  vf.draw();

  const previewLayout: PreviewLayout = {
    lowerHandles: [],
    staves,
    staffType,
    upperHandles: [],
  };

  const addHandle = (bound: NoteRangeBound, clef: 'treble' | 'bass', note: string): void => {
    const target = bound === 'lower' ? previewLayout.lowerHandles : previewLayout.upperHandles;
    const centerY = getPreviewYForNote(clef, note, previewLayout);
    target.length = 0;
    target.push({
      clef,
      x: NOTE_RANGE_WIDTH / 2,
      y: centerY,
      note,
    });
  };

  if (staffType === 'grand') {
    const minClef = getGrandStaffPreviewClef(range.minNote);
    addHandle('lower', minClef, range.minNote);

    const upperClef = getGrandStaffPreviewClef(range.maxNote);
    addHandle('upper', upperClef, range.maxNote);
  } else {
    addHandle('lower', staffType, range.minNote);
    addHandle('upper', staffType, range.maxNote);
  }

  currentPreviewLayout = previewLayout;

  const lowerNoteElement = staffType === 'grand'
    ? getRenderedNoteElement(getGrandStaffPreviewClef(range.minNote) === 'treble' ? trebleRefs[0] ?? null : bassRefs[0] ?? null)
    : getRenderedNoteElement((staffType === 'treble' ? trebleRefs : bassRefs)[0] ?? null);
  const upperNoteElement = staffType === 'grand'
    ? getRenderedNoteElement((getGrandStaffPreviewClef(range.maxNote) === 'treble' ? trebleRefs : bassRefs)[
      getGrandStaffPreviewClef(range.maxNote) === getGrandStaffPreviewClef(range.minNote) ? 1 : 0
    ] ?? null)
    : getRenderedNoteElement((staffType === 'treble' ? trebleRefs : bassRefs)[1] ?? (staffType === 'treble' ? trebleRefs : bassRefs)[0] ?? null);

  const lowerNoteIndex = getRenderedNoteIndex(lowerNoteElement, visual);
  const upperNoteIndex = getRenderedNoteIndex(upperNoteElement, visual);

  storePreviewCache(cacheKey, {
    html: visual.innerHTML,
    lowerNoteIndex,
    previewLayout,
    upperNoteIndex,
  });

  renderPreviewOverlay(staffType, range, lowerNoteElement, upperNoteElement);
}

function renderPreviewOverlay(
  staffType: StaffType,
  range: NoteRange,
  lowerNoteElement: SVGElement | null,
  upperNoteElement: SVGElement | null,
): void {
  const visual = ui.visual;

  if (!visual || !currentPreviewLayout) {
    return;
  }

  visual.querySelector('.note-range-overlay')?.remove();

  const rendererHeight = staffType === 'grand' ? NOTE_RANGE_GRAND_HEIGHT : NOTE_RANGE_SINGLE_HEIGHT;
  const previewLayout = currentPreviewLayout;
  const overlay = document.createElement('div');
  overlay.className = 'note-range-overlay';
  overlay.dataset.staffType = staffType;
  overlay.style.height = `${rendererHeight}px`;

  const createHandle = (
    bound: NoteRangeBound,
    handleLayout: { clef: 'treble' | 'bass'; x: number; y: number; note: string },
    note: string,
    noteElement: SVGElement | null,
  ): HTMLButtonElement => {
    const handle = document.createElement('button');
    const startDrag = (event: Event): void => {
      if (activeDragTarget) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      let clientY = 0;
      if ('touches' in event && (event as TouchEvent).touches.length > 0) {
        clientY = (event as TouchEvent).touches[0].clientY;
      } else if (event instanceof MouseEvent || event instanceof PointerEvent) {
        clientY = event.clientY;
      }

      const rect = visual.getBoundingClientRect();
      dragVisualTop = rect.top ?? 0;
      dragStaffType = staffType;
      dragRangeDraft = getStoredStaffNoteRanges()[staffType];

      const handleY = handleLayout.y + dragVisualTop;
      const currentNote = bound === 'lower' ? dragRangeDraft.minNote : dragRangeDraft.maxNote;
      let adjustedHandleY = handleY;
      if (currentNote !== handleLayout.note && currentPreviewLayout) {
        const actualNoteY = getPreviewYForNote(handleLayout.clef, currentNote, currentPreviewLayout);
        adjustedHandleY = actualNoteY + dragVisualTop;
      }
      dragYOffset = clientY - adjustedHandleY;

      activeDragTarget = { bound, clef: handleLayout.clef };
      bindDragListeners();
      visual.classList.add('note-range-visual-dragging');
      setHovered(true);
      handleMove(event as MouseEvent | PointerEvent | TouchEvent);
    };
    const setHovered = (isHovered: boolean): void => {
      if (activeDragTarget && activeDragTarget.bound === bound && !isHovered) {
        return;
      }
      setRenderedNoteHoverState(noteElement, isHovered);
    };

    handle.type = 'button';
    handle.className = `note-range-handle note-range-handle-${bound}`;
    handle.dataset.bound = bound;
    handle.dataset.clef = handleLayout.clef;
    handle.dataset.note = note;
    handle.setAttribute('aria-label', `${bound === 'lower' ? 'Lower' : 'Upper'} note ${note}`);
    handle.style.left = `${handleLayout.x}px`;
    handle.style.top = `${handleLayout.y}px`;
    handle.style.width = '40px';
    handle.style.height = '40px';
    handle.style.marginLeft = '-20px';
    handle.style.marginTop = '-20px';
    handle.style.zIndex = bound === 'upper' ? '10' : '5';
    handle.setAttribute('title', `${bound === 'lower' ? 'Lower' : 'Upper'} note ${note}`);

    if (activeDragTarget && activeDragTarget.bound === bound) {
      setHovered(true);
    }
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('pointerdown', startDrag);
    handle.addEventListener('mouseenter', () => setHovered(true));
    handle.addEventListener('mouseleave', () => setHovered(false));
    handle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setHovered(true);
      startDrag(e);
    }, { passive: false });
    handle.addEventListener('touchend', () => setHovered(false));
    handle.addEventListener('focus', () => setHovered(true));
    handle.addEventListener('blur', () => setHovered(false));

    return handle;
  };

  previewLayout.lowerHandles.forEach((handleLayout) => {
    const handle = createHandle('lower', handleLayout, range.minNote, lowerNoteElement);
    overlay.appendChild(handle);
    if (activeDragTarget && activeDragTarget.bound === 'lower') {
      setRenderedNoteHoverState(lowerNoteElement, true);
    }
  });
  previewLayout.upperHandles.forEach((handleLayout) => {
    const handle = createHandle('upper', handleLayout, range.maxNote, upperNoteElement);
    overlay.appendChild(handle);
    if (activeDragTarget && activeDragTarget.bound === 'upper') {
      setRenderedNoteHoverState(upperNoteElement, true);
    }
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

function updateRangeUIWithoutReRender(staffType: StaffType, range: NoteRange): void {
  syncHiddenInputs(range);
  renderSummary(range);

  if (ui.selectedStaffLabel) {
    ui.selectedStaffLabel.textContent = `${STAFF_LABELS[staffType]} range`;
  }
}

function findClosestNoteForClientY(staffType: StaffType, clef: 'treble' | 'bass', clientY: number, bound: NoteRangeBound): string {
  const allNotes = getAvailableRangeForStaff(staffType);
  const currentRange = getCurrentRangeForStaff(staffType);
  
  let notes = allNotes;
  
  // On Grand Staff, the bass clef handle should only select notes up to the split point,
  // and the treble handle should only select notes from the split point upwards.
  // This prevents the handles from 'jumping' across staves.
  if (staffType === 'grand') {
    if (clef === 'bass') {
      notes = allNotes.filter(note => getNoteValue(note) < getNoteValue(GRAND_STAFF_LOGICAL_SPLIT_NOTE));
    } else {
      notes = allNotes.filter(note => getNoteValue(note) >= getNoteValue(GRAND_STAFF_LOGICAL_SPLIT_NOTE));
    }
  }

  // Also ensure that minNote doesn't exceed maxNote and vice versa during drag.
  // We allow them to be equal, but not cross.
  if (bound === 'lower') {
    const maxVal = getNoteValue(currentRange.maxNote);
    notes = notes.filter(note => getNoteValue(note) <= maxVal);
  } else {
    const minVal = getNoteValue(currentRange.minNote);
    notes = notes.filter(note => getNoteValue(note) >= minVal);
  }

  if (notes.length === 0) return (bound === 'lower' ? currentRange.minNote : currentRange.maxNote);

  const visualElement = ui.visual;
  const rect = visualElement?.getBoundingClientRect();
  const top = dragStaffType === staffType && dragVisualTop !== 0 ? dragVisualTop : rect?.top ?? 0;
  const targetY = (rect && rect.height > 0) ? clientY - top : clientY;
  const previewLayout = currentPreviewLayout;

  if (!previewLayout || !previewLayout.staves[clef]) {
    // Fallback for tests or when layout is missing: simple linear interpolation
    const height = (rect && rect.height > 0) ? rect.height : 300;
    const percentage = Math.max(0, Math.min(1, targetY / height));
    // index 0 is LOWEST, index last is HIGHEST
    // top (0) -> HIGHEST (last)
    // bottom (height) -> LOWEST (0)
    const index = Math.round((1 - percentage) * (notes.length - 1));
    return notes[index]!;
  }

  // Optimization: use a for loop with early-exit
  let closestNote = notes[0]!;
  let minDistance = Infinity;

  // Use a simple loop for better performance during drag
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteY = getPreviewYForNote(clef, note, previewLayout);
    const distance = Math.abs(noteY - targetY);
    if (distance < minDistance) {
      minDistance = distance;
      closestNote = note;
    } else if (distance > minDistance) {
      // Since noteY is monotonic with note index, once the distance starts increasing,
      // we've passed the closest note.
      break;
    }
  }

  return closestNote;
}

function bindDragListeners(): void {
  if (dragListenersBound) {
    return;
  }

  window.addEventListener('mousemove', handleMove, { passive: false });
  window.addEventListener('pointermove', handleMove, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('mouseup', handleUp);
  window.addEventListener('pointerup', handleUp);
  window.addEventListener('touchend', handleUp);
  window.addEventListener('touchcancel', handleUp);
  
  dragListenersBound = true;
}

function unbindDragListeners(): void {
  if (!dragListenersBound) {
    return;
  }

  window.removeEventListener('mousemove', handleMove);
  window.removeEventListener('pointermove', handleMove);
  window.removeEventListener('touchmove', handleMove);
  window.removeEventListener('mouseup', handleUp);
  window.removeEventListener('pointerup', handleUp);
  window.removeEventListener('touchend', handleUp);
  window.removeEventListener('touchcancel', handleUp);

  dragListenersBound = false;
}

export function setNoteRangeForStaff(staffType: StaffType, range: Partial<NoteRange>): void {
  const storedRanges = getStoredStaffNoteRanges();
  storedRanges[staffType] = clampNoteRangeForStaff(staffType, range);
  saveStoredStaffNoteRanges(storedRanges);

  if (staffType === getCurrentStaffType()) {
    updateRangeUI(staffType, storedRanges[staffType]);
  }
}

export function setCurrentStaffNoteRange(
  range: Partial<NoteRange>,
  notifyChange = false,
  skipReRender = false,
  persist = true,
): void {
  const staffType = getCurrentStaffType();
  const nextRange = clampNoteRangeForStaff(staffType, range);

  if (persist) {
    const storedRanges = getStoredStaffNoteRanges();
    storedRanges[staffType] = nextRange;
    saveStoredStaffNoteRanges(storedRanges);
  }

  if (skipReRender) {
    updateRangeUIWithoutReRender(staffType, nextRange);
  } else {
    updateRangeUI(staffType, nextRange);
  }

  if (notifyChange) {
    dispatchRangeChange();
  }
}

export function updateNoteRangeSelector(): void {
  const staffType = getCurrentStaffType();
  updateRangeUI(staffType, getStoredStaffNoteRanges()[staffType]);
}
