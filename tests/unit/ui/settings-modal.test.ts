import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeSettingsModal,
  initSettingsModal,
  isSettingsModalOpen,
  markSettingsChanged,
  openSettingsModal,
} from '@/ui/settings-modal';

function mountSettingsModalDOM(): void {
  document.body.innerHTML = `
    <div class="toolbar-actions"></div>
    <section class="panel-grid"></section>
    <details id="stats-details"></details>
    <div class="output-shell"></div>
    <div id="keyboard-dock"></div>
    <button id="settings-menu-toggle" aria-expanded="false"></button>
    <div id="settings-modal-backdrop" hidden></div>
    <div id="settings-modal" hidden>
      <div class="settings-modal-panel">
        <button id="settings-modal-close" type="button">Close</button>
      </div>
    </div>
  `;
}

describe('settings-modal lifecycle', () => {
  beforeEach(() => {
    mountSettingsModalDOM();
    closeSettingsModal();
  });

  it('applies changes exactly once when the modal closes after edits', () => {
    const onApply = vi.fn();

    initSettingsModal(onApply);
    openSettingsModal();
    markSettingsChanged();

    closeSettingsModal(onApply);
    closeSettingsModal(onApply);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(isSettingsModalOpen()).toBe(false);
  });

  it('does not apply when the modal is closed without changes', () => {
    const onApply = vi.fn();

    initSettingsModal(onApply);

    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    menuButton.click();
    menuButton.click();

    expect(onApply).not.toHaveBeenCalled();
    expect(isSettingsModalOpen()).toBe(false);
  });

  it('clears stale dirty state when reopening the modal', () => {
    const onApply = vi.fn();

    initSettingsModal(onApply);

    openSettingsModal();
    markSettingsChanged();
    closeSettingsModal(onApply);

    openSettingsModal();
    closeSettingsModal(onApply);

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('focuses the close button and blocks background containers while open', () => {
    initSettingsModal();

    const panelGrid = document.querySelector('.panel-grid') as HTMLElement;
    const toolbarActions = document.querySelector('.toolbar-actions') as HTMLElement;
    const keyboardDock = document.getElementById('keyboard-dock') as HTMLElement;
    const closeButton = document.getElementById('settings-modal-close') as HTMLButtonElement;

    openSettingsModal();

    expect(document.activeElement).toBe(closeButton);
    expect(panelGrid.getAttribute('aria-hidden')).toBe('true');
    expect(toolbarActions.hasAttribute('inert')).toBe(true);
    expect(keyboardDock.hasAttribute('inert')).toBe(true);

    closeSettingsModal();

    expect(panelGrid.hasAttribute('inert')).toBe(false);
    expect(toolbarActions.hasAttribute('inert')).toBe(false);
    expect(keyboardDock.hasAttribute('inert')).toBe(false);
  });
});
