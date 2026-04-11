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
}

export function isSettingsModalOpen(): boolean {
  return !getSettingsModal()?.hidden;
}

export function openSettingsModal(): void {
  updateSettingsModalUI(true);
}

export function closeSettingsModal(): void {
  updateSettingsModalUI(false);
}

export function initSettingsModal(): void {
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
      closeSettingsModal();
      return;
    }

    openSettingsModal();
  };
  closeButton.onclick = () => closeSettingsModal();
  backdrop.onclick = () => closeSettingsModal();
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeSettingsModal();
    }
  };
  modalPanel.onclick = (event) => event.stopPropagation();

  const blockBackgroundInteraction = (event: Event) => {
    if (!isSettingsModalOpen()) {
      return;
    }

    const target = event.target as Node | null;
    const shouldBlock = target !== null
      && getBlockedBackgroundContainers().some((element) => element.contains(target));

    if (!shouldBlock) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if ('stopImmediatePropagation' in event) {
      event.stopImmediatePropagation();
    }
  };

  document.addEventListener('pointerdown', blockBackgroundInteraction, true);
  document.addEventListener('click', blockBackgroundInteraction, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSettingsModalOpen()) {
      closeSettingsModal();
    }
  });
}
