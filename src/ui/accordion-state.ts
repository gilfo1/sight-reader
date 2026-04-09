import { loadFromStorage, saveToStorage } from '@/utils/storage';

const ACCORDION_STORAGE_KEY = 'accordion-state';
const DEFAULT_OPEN_ACCORDIONS = new Set(['piano-keyboard-details']);

export function saveAccordionState(): void {
  const accordionState: Record<string, boolean> = {};

  document.querySelectorAll('details').forEach((accordion) => {
    if (accordion.id) {
      accordionState[accordion.id] = accordion.open;
    }
  });

  saveToStorage(ACCORDION_STORAGE_KEY, accordionState);
}

export function loadAccordionState(): void {
  const accordionState = loadFromStorage<Record<string, boolean>>(ACCORDION_STORAGE_KEY);

  if (!accordionState) {
    return;
  }

  Object.entries(accordionState).forEach(([id, isOpen]) => {
    const accordion = document.getElementById(id) as HTMLDetailsElement | null;

    if (accordion) {
      accordion.open = isOpen;
    }
  });
}

export function resetAccordionState(): void {
  document.querySelectorAll('details').forEach((accordion) => {
    accordion.open = DEFAULT_OPEN_ACCORDIONS.has(accordion.id);
  });

  saveAccordionState();
}
