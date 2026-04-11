const NOTE_RANGE_HOVER_COLOR = '#255b78';
const HOVER_LEDGER_LINE_DISTANCE_PX = 35;

function setHighlightDataAttributes(element: SVGElement): void {
  const htmlElement = element as unknown as HTMLElement;

  if (htmlElement.dataset.noteRangeOriginalStroke === undefined) {
    htmlElement.dataset.noteRangeOriginalStroke = element.getAttribute('stroke') ?? '';
  }

  if (htmlElement.dataset.noteRangeOriginalFill === undefined) {
    htmlElement.dataset.noteRangeOriginalFill = element.getAttribute('fill') ?? '';
  }
}

function updateHighlightElement(element: SVGElement, isHovered: boolean): void {
  if (isHovered) {
    setHighlightDataAttributes(element);
    element.setAttribute('stroke', NOTE_RANGE_HOVER_COLOR);
    element.setAttribute('fill', NOTE_RANGE_HOVER_COLOR);
    return;
  }

  const htmlElement = element as unknown as HTMLElement;
  const originalStroke = htmlElement.dataset.noteRangeOriginalStroke ?? '';
  const originalFill = htmlElement.dataset.noteRangeOriginalFill ?? '';

  if (originalStroke) {
    element.setAttribute('stroke', originalStroke);
  } else {
    element.removeAttribute('stroke');
  }

  if (originalFill) {
    element.setAttribute('fill', originalFill);
  } else {
    element.removeAttribute('fill');
  }
}

function isLedgerLineCandidate(element: Element | null): element is SVGElement {
  if (!(element instanceof SVGElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  return tagName === 'path' || tagName === 'rect';
}

function getElementVerticalCenter(element: SVGElement): number {
  const graphicsElement = element as unknown as SVGGraphicsElement;
  const box = (element as unknown as { getBoundingBox?: () => { y: number; height: number } }).getBoundingBox
    ? (element as unknown as { getBoundingBox: () => { y: number; height: number } }).getBoundingBox()
    : (graphicsElement.getBBox ? graphicsElement.getBBox() : { y: 0, height: 0 });

  return box.y + (box.height / 2);
}

function collectAdjacentLedgerLines(noteElement: SVGElement): SVGElement[] {
  const targets: SVGElement[] = [];
  const noteCenterY = getElementVerticalCenter(noteElement);

  let sibling = noteElement.nextElementSibling;
  while (isLedgerLineCandidate(sibling)) {
    if (sibling.classList.contains('vf-stavenote')) {
      break;
    }

    if (Math.abs(getElementVerticalCenter(sibling) - noteCenterY) < HOVER_LEDGER_LINE_DISTANCE_PX) {
      targets.push(sibling);
    }

    sibling = sibling.nextElementSibling;
  }

  let previousSibling = noteElement.previousElementSibling;
  while (isLedgerLineCandidate(previousSibling)) {
    if (previousSibling.classList.contains('vf-stavenote')) {
      break;
    }

    if (Math.abs(getElementVerticalCenter(previousSibling) - noteCenterY) < HOVER_LEDGER_LINE_DISTANCE_PX) {
      targets.push(previousSibling);
    }

    previousSibling = previousSibling.previousElementSibling;
  }

  return targets;
}

function collectHighlightTargets(noteElement: SVGElement): SVGElement[] {
  const targets = [
    ...noteElement.querySelectorAll<SVGElement>('path, ellipse, line, polygon, rect'),
  ];

  if (noteElement.tagName.toLowerCase() !== 'g') {
    return [noteElement, ...targets];
  }

  return [...targets, ...collectAdjacentLedgerLines(noteElement)];
}

export function applyRenderedNoteHoverState(noteElement: SVGElement | null, isHovered: boolean): void {
  if (!noteElement) {
    return;
  }

  noteElement.classList.toggle('note-range-note-hovered', isHovered);
  noteElement.setAttribute('data-note-range-hovered', String(isHovered));

  collectHighlightTargets(noteElement).forEach((element) => {
    updateHighlightElement(element, isHovered);
  });
}
