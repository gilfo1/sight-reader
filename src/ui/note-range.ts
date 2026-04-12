import { ALL_PIANO_NOTES } from '@/constants/music';
import { getElementById } from '@/ui/dom';
import {
  createNoteRangeHandle,
  type NoteRangeBound as DragNoteRangeBound,
  type NoteRangeHandleLayout,
} from '@/ui/note-range-drag';
import {
  applyRenderedNoteHoverState,
  getPreviewStaffNotes,
  getPreviewYForNote,
  NOTE_RANGE_GRAND_HEIGHT,
  NOTE_RANGE_SINGLE_HEIGHT,
  noteRequiresLedgerLines,
  type NoteRange,
  type PreviewLayout,
  renderCachedPreview,
  type StaffType,
} from '@/ui/note-range-preview';
import { saveToStorage, loadFromStorage } from '@/utils/storage';
import { getNoteValue } from '@/utils/theory';

const STAFF_NOTE_RANGE_STORAGE_KEY = 'staff-note-ranges';
const NATURAL_PIANO_NOTES = ALL_PIANO_NOTES.filter((note) => !note.includes('#'));

export type NoteRangeBound = DragNoteRangeBound;

interface StaffNoteRanges {
  bass: NoteRange;
  grand: NoteRange;
  treble: NoteRange;
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
export type { StaffType } from '@/ui/note-range-preview';

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
  // If it's a touch event, it might not have coordinates on touchend/touchcancel,
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

export function getAvailableRangeForStaff(staffType: StaffType): string[] {
  if (availableNotesCache && lastStaffTypeForCache === staffType) {
    return availableNotesCache;
  }

  // Common limits for all staff types to prevent notes from going too far off-screen
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

export { getPreviewStaffNotes, noteRequiresLedgerLines };

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

function setRenderedNoteHoverState(noteElement: SVGElement | null, isHovered: boolean): void {
  applyRenderedNoteHoverState(noteElement, isHovered);
}

function getEventClientY(event: Event): number {
  if ('touches' in event && (event as TouchEvent).touches.length > 0) {
    return (event as TouchEvent).touches[0]!.clientY;
  }

  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return event.clientY;
  }

  return 0;
}

function initializeDragState(
  event: Event,
  bound: NoteRangeBound,
  handleLayout: { clef: 'treble' | 'bass'; x: number; y: number; note: string },
  staffType: StaffType,
): void {
  const visual = ui.visual;
  const rect = visual?.getBoundingClientRect();

  dragVisualTop = rect?.top ?? 0;
  dragStaffType = staffType;
  dragRangeDraft = getStoredStaffNoteRanges()[staffType];

  const clientY = getEventClientY(event);
  const handleY = handleLayout.y + dragVisualTop;
  const currentNote = bound === 'lower' ? dragRangeDraft.minNote : dragRangeDraft.maxNote;
  const adjustedHandleY = currentNote !== handleLayout.note && currentPreviewLayout
    ? getPreviewYForNote(handleLayout.clef, currentNote, currentPreviewLayout) + dragVisualTop
    : handleY;

  dragYOffset = clientY - adjustedHandleY;
  activeDragTarget = { bound, clef: handleLayout.clef };
}

function createPreviewHandle(
  bound: NoteRangeBound,
  handleLayout: NoteRangeHandleLayout,
  note: string,
  noteElement: SVGElement | null,
  staffType: StaffType,
): HTMLButtonElement {
  return createNoteRangeHandle({
    bound,
    handleLayout,
    isActiveDragBound: (candidateBound) => activeDragTarget?.bound === candidateBound,
    note,
    noteElement,
    onStartDrag: (event, nextBound, nextHandleLayout, nextStaffType) => {
      initializeDragState(event, nextBound, nextHandleLayout, nextStaffType);
      bindDragListeners();
      ui.visual?.classList.add('note-range-visual-dragging');
      handleMove(event as MouseEvent | PointerEvent | TouchEvent);
    },
    setRenderedNoteHoverState,
    staffType,
  });
}

function renderVexFlowPreview(staffType: StaffType, range: NoteRange): void {
  const visual = ui.visual;

  if (!visual) {
    return;
  }
  visual.dataset.staffType = staffType;
  const { lowerNoteElement, previewLayout, upperNoteElement } = renderCachedPreview(visual, staffType, range);
  currentPreviewLayout = previewLayout;

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
    return createPreviewHandle(bound, handleLayout, note, noteElement, staffType);
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
  // We allow them to be equal but not cross.
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
