import type { StaffType } from '@/ui/note-range-preview';

export type NoteRangeBound = 'lower' | 'upper';

export interface NoteRangeHandleLayout {
  clef: 'treble' | 'bass';
  note: string;
  x: number;
  y: number;
}

interface CreateNoteRangeHandleOptions {
  bound: NoteRangeBound;
  handleLayout: NoteRangeHandleLayout;
  isActiveDragBound: (bound: NoteRangeBound) => boolean;
  note: string;
  noteElement: SVGElement | null;
  onStartDrag: (event: Event, bound: NoteRangeBound, handleLayout: NoteRangeHandleLayout, staffType: StaffType) => void;
  setRenderedNoteHoverState: (noteElement: SVGElement | null, isHovered: boolean) => void;
  staffType: StaffType;
}

export function createNoteRangeHandle({
  bound,
  handleLayout,
  isActiveDragBound,
  note,
  noteElement,
  onStartDrag,
  setRenderedNoteHoverState,
  staffType,
}: CreateNoteRangeHandleOptions): HTMLButtonElement {
  const handle = document.createElement('button');

  const setHovered = (isHovered: boolean): void => {
    if (isActiveDragBound(bound) && !isHovered) {
      return;
    }
    setRenderedNoteHoverState(noteElement, isHovered);
  };

  const startDrag = (event: Event): void => {
    if (isActiveDragBound('lower') || isActiveDragBound('upper')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onStartDrag(event, bound, handleLayout, staffType);
    setHovered(true);
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

  if (isActiveDragBound(bound)) {
    setHovered(true);
  }

  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('pointerdown', startDrag);
  handle.addEventListener('mouseenter', () => setHovered(true));
  handle.addEventListener('mouseleave', () => setHovered(false));
  handle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrag(e);
  }, { passive: false });
  handle.addEventListener('touchend', () => setHovered(false));
  handle.addEventListener('focus', () => setHovered(true));
  handle.addEventListener('blur', () => setHovered(false));

  return handle;
}
