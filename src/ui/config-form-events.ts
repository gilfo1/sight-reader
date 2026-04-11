import { saveAccordionState } from '@/ui/accordion-state';
import { ui, updateNoteSelectors } from '@/ui/config-form-state';

interface EventListenerCallbacks {
  markSettingsChanged: () => void;
  onConfigChange: () => void;
  saveUIConfig: () => void;
}

function handleConfigFieldChange(
  field: HTMLElement | null,
  callbacks: EventListenerCallbacks,
): void {
  if (field === ui.staffType) {
    updateNoteSelectors();
  }

  callbacks.saveUIConfig();
  callbacks.markSettingsChanged();
  callbacks.onConfigChange();
}

function bindCheckboxContainerChanges(
  container: HTMLElement | null,
  callbacks: EventListenerCallbacks,
): void {
  container?.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      callbacks.saveUIConfig();
      callbacks.markSettingsChanged();
      callbacks.onConfigChange();
    });
  });
}

export function setupConfigFormEventListeners(callbacks: EventListenerCallbacks): void {
  const fields: Array<HTMLElement | null> = [
    ui.measuresPerLine,
    ui.lines,
    ui.staffType,
    ui.notesPerStep,
    ui.noteRangeSelector,
    ui.maxReach,
    ui.adaptiveLearning,
  ];

  fields.forEach((field) => {
    field?.addEventListener('change', () => {
      handleConfigFieldChange(field, callbacks);
    });
  });

  [ui.noteValues, ui.keySignatures].forEach((container) => {
    bindCheckboxContainerChanges(container, callbacks);
  });

  document.querySelectorAll('details').forEach((accordion) => {
    accordion.addEventListener('toggle', () => {
      saveAccordionState();
      if (accordion.id === 'piano-keyboard-details') {
        callbacks.onConfigChange();
      }
    });
  });
}
