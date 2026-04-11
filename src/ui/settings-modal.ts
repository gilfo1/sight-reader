function getSettingsModal(): HTMLElement | null {
  return document.getElementById('settings-modal');
}

function getSettingsBackdrop(): HTMLElement | null {
  return document.getElementById('settings-modal-backdrop');
}

function getSettingsMenuButton(): HTMLButtonElement | null {
  return document.getElementById('settings-menu-toggle') as HTMLButtonElement | null;
}

function getBlockedBackgroundContainers(): HTMLElement[] {
  const panelGrid = document.querySelector('.panel-grid') as HTMLElement | null;
  const outputShell = document.querySelector('.output-shell') as HTMLElement | null;
  const keyboardDock = document.getElementById('keyboard-dock') as HTMLElement | null;
  const statsAccordion = document.getElementById('stats-details') as HTMLElement | null;
  const toolbarActions = document.querySelector('.toolbar-actions') as HTMLElement | null;
  return [panelGrid, outputShell, keyboardDock, statsAccordion, toolbarActions].filter((element): element is HTMLElement => element !== null);
}

function setBackgroundInteractivity(isInteractive: boolean): void {
  getBlockedBackgroundContainers().forEach((element) => {
    if (!element) {
      return;
    }

    if (isInteractive) {
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    } else {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    }
  });
}

function updateSettingsModalUI(isOpen: boolean): void {
  const modal = getSettingsModal();
  const backdrop = getSettingsBackdrop();
  const menuButton = getSettingsMenuButton();

  if (!modal || !backdrop || !menuButton) {
    return;
  }

  modal.hidden = !isOpen;
  backdrop.hidden = !isOpen;
  modal.setAttribute('aria-hidden', String(!isOpen));
  menuButton.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('modal-open', isOpen);
  setBackgroundInteractivity(!isOpen);
  if (isOpen) {
    // Focus close button for accessibility
    getSettingsModal()?.querySelector<HTMLElement>('#settings-modal-close')?.focus();
  }
}

let hasChanges = false;

export function markSettingsChanged(): void {
  hasChanges = true;
}

export function isSettingsModalOpen(): boolean {
  return !getSettingsModal()?.hidden;
}

export function openSettingsModal(): void {
  hasChanges = false;
  updateSettingsModalUI(true);
}

export function closeSettingsModal(onApply?: () => void): void {
  if (hasChanges && onApply) {
    onApply();
  }
  hasChanges = false;
  updateSettingsModalUI(false);
}

export function initSettingsModal(onApply?: () => void): void {
  const menuButton = getSettingsMenuButton();
  const closeButton = document.getElementById('settings-modal-close') as HTMLButtonElement | null;
  const backdrop = getSettingsBackdrop();
  const modal = getSettingsModal();
  const modalPanel = document.querySelector('.settings-modal-panel') as HTMLElement | null;

  if (!menuButton || !closeButton || !backdrop || !modal || !modalPanel) {
    return;
  }

  updateSettingsModalUI(false);
  menuButton.onclick = () => {
    if (isSettingsModalOpen()) {
      closeSettingsModal(onApply);
      return;
    }

    openSettingsModal();
  };
  closeButton.onclick = () => closeSettingsModal(onApply);
  backdrop.onclick = () => closeSettingsModal(onApply);
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeSettingsModal(onApply);
    }
  };
  modalPanel.onclick = (event) => event.stopPropagation();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSettingsModalOpen()) {
      closeSettingsModal(onApply);
    }
  });
}
