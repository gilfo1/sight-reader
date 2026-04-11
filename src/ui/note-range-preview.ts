import { getNoteValue } from '@/utils/theory';
import { buildPreviewRenderData } from '@/ui/note-range-preview-build';
import { applyRenderedNoteHoverState } from '@/ui/note-range-preview-hover';

export type StaffType = 'grand' | 'treble' | 'bass';

export interface NoteRange {
  minNote: string;
  maxNote: string;
}

export interface PreviewLayout {
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

interface PreviewStaffNotes {
  bass: string[];
  treble: string[];
}

export const NOTE_RANGE_WIDTH = 244;
export const NOTE_RANGE_SINGLE_HEIGHT = 380;
export const NOTE_RANGE_GRAND_HEIGHT = 380;
const GRAND_STAFF_VISUAL_SPLIT_NOTE = 'C4';

const previewCache = new Map<string, CachedPreview>();
const MAX_PREVIEW_CACHE_ENTRIES = 24;

export function getGrandStaffPreviewClef(note: string): 'treble' | 'bass' {
  return getNoteValue(note) < getNoteValue(GRAND_STAFF_VISUAL_SPLIT_NOTE) ? 'bass' : 'treble';
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

export function getPreviewYForNote(clef: 'treble' | 'bass', note: string, previewLayout: PreviewLayout): number {
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

function getPreviewCacheKey(staffType: StaffType, range: NoteRange): string {
  return `${staffType}:${range.minNote}:${range.maxNote}`;
}

function getRenderedNoteElements(visual: HTMLElement): SVGElement[] {
  return Array.from(visual.querySelectorAll<SVGElement>('.vf-stavenote'));
}

function getRenderedNoteIndex(noteElement: SVGElement | null, noteElements: SVGElement[]): number {
  if (!noteElement) {
    return -1;
  }

  return noteElements.indexOf(noteElement);
}

function getCachedRenderedNote(noteElements: SVGElement[], index: number): SVGElement | null {
  if (index < 0) {
    return null;
  }

  return noteElements[index] ?? null;
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

export function renderCachedPreview(
  visual: HTMLElement,
  staffType: StaffType,
  range: NoteRange,
): { lowerNoteElement: SVGElement | null; previewLayout: PreviewLayout; upperNoteElement: SVGElement | null } {
  const cacheKey = getPreviewCacheKey(staffType, range);
  const cachedPreview = previewCache.get(cacheKey);

  if (cachedPreview) {
    visual.innerHTML = cachedPreview.html;
    const noteElements = getRenderedNoteElements(visual);
    return {
      previewLayout: cachedPreview.previewLayout,
      lowerNoteElement: getCachedRenderedNote(noteElements, cachedPreview.lowerNoteIndex),
      upperNoteElement: getCachedRenderedNote(noteElements, cachedPreview.upperNoteIndex),
    };
  }

  visual.innerHTML = '';
  const { lowerNoteElement, previewLayout, upperNoteElement } = buildPreviewRenderData(visual, staffType, range);
  const noteElements = getRenderedNoteElements(visual);

  storePreviewCache(cacheKey, {
    html: visual.innerHTML,
    lowerNoteIndex: getRenderedNoteIndex(lowerNoteElement, noteElements),
    previewLayout,
    upperNoteIndex: getRenderedNoteIndex(upperNoteElement, noteElements),
  });

  return { lowerNoteElement, previewLayout, upperNoteElement };
}

export { applyRenderedNoteHoverState };
