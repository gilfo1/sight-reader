import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { initApp, resetGameState } from '@/main';

describe('Settings Modal', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameState();
    const html = readFileSync('./index.html', 'utf-8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
    Array.from(doc.body.attributes).forEach((attribute) => {
      document.body.setAttribute(attribute.name, attribute.value);
    });
    window.confirm = vi.fn().mockReturnValue(true);
    (window as any).navigator.requestMIDIAccess = vi.fn().mockResolvedValue({
      inputs: new Map(),
      outputs: new Map(),
    });
  });

  it('opens the settings modal from the hamburger button', async () => {
    await initApp();

    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    const modal = document.getElementById('settings-modal') as HTMLElement;
    const backdrop = document.getElementById('settings-modal-backdrop') as HTMLElement;
    const panelGrid = document.querySelector('.panel-grid') as HTMLElement;
    const keyboardDock = document.getElementById('keyboard-dock') as HTMLElement;

    expect(modal.hidden).toBe(true);
    menuButton.click();

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(modal.hidden).toBe(false);
    expect(backdrop.hidden).toBe(false);
    expect(document.body.classList.contains('modal-open')).toBe(true);
    // Note: CSS classes for hidden are used instead of .hidden property for transitions
    expect(window.getComputedStyle(modal).visibility).not.toBe('hidden');
    expect(panelGrid.hasAttribute('inert')).toBe(true);
    expect(keyboardDock.hasAttribute('inert')).toBe(true);
  });

  it('closes the settings modal from the hamburger toggle, close button, backdrop, and escape key', async () => {
    await initApp();

    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    const closeButton = document.getElementById('settings-modal-close') as HTMLButtonElement;
    const modal = document.getElementById('settings-modal') as HTMLElement;
    const backdrop = document.getElementById('settings-modal-backdrop') as HTMLElement;
    const panelGrid = document.querySelector('.panel-grid') as HTMLElement;

    menuButton.click();
    menuButton.click();
    expect(modal.hidden).toBe(true);
    expect(panelGrid.hasAttribute('inert')).toBe(false);

    menuButton.click();
    closeButton.click();
    expect(modal.hidden).toBe(true);

    menuButton.click();
    backdrop.click();
    expect(modal.hidden).toBe(true);

    menuButton.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal.hidden).toBe(true);
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(panelGrid.hasAttribute('inert')).toBe(false);
  });

  it('keeps a blocking backdrop around the modal while open', async () => {
    await initApp();

    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    const backdrop = document.getElementById('settings-modal-backdrop') as HTMLElement;
    const modal = document.getElementById('settings-modal') as HTMLElement;

    menuButton.click();

    expect(backdrop.hidden).toBe(false);
    expect(backdrop.classList.contains('modal-backdrop')).toBe(true);
    expect(modal.hidden).toBe(false);
  });

  it('prevents underlying controls from being focused while open via inert', async () => {
    await initApp();

    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    const toolbarActions = document.querySelector('.toolbar-actions') as HTMLElement;

    menuButton.click();
    
    expect(toolbarActions.hasAttribute('inert')).toBe(true);
    // In JSDOM, inert doesn't stop dispatchEvent, but it's the standard way to block interaction.
    expect((document.getElementById('settings-modal') as HTMLElement).hidden).toBe(false);
  });

  it('keeps all settings controls inside the modal panel', async () => {
    await initApp();

    const modal = document.getElementById('settings-modal') as HTMLElement;
    const controls = document.getElementById('controls') as HTMLElement;

    expect(modal.querySelector('#controls')).toBe(controls);
    expect(modal.querySelector('#measures-per-line')).not.toBeNull();
    expect(modal.querySelector('#staff-type')).not.toBeNull();
    expect(modal.querySelector('#key-signatures')).not.toBeNull();
    expect(modal.querySelector('#reset-all-settings')).not.toBeNull();
  });

  it('preserves config changes made while the modal is open', async () => {
    await initApp();

    const menuButton = document.getElementById('settings-menu-toggle') as HTMLButtonElement;
    const measures = document.getElementById('measures-per-line') as HTMLSelectElement;

    menuButton.click();
    measures.value = '6';
    measures.dispatchEvent(new Event('change'));

    expect(JSON.parse(localStorage.getItem('generator-config') ?? '{}').measuresPerLine).toBe(6);
  });
});
