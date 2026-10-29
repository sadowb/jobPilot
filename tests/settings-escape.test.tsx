// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from '../src/renderer/src/pages/SettingsPage';
import { queryClient } from '../src/renderer/src/lib/query';

vi.mock('../src/renderer/src/features/settings/AgentCard', () => ({ AgentCard: () => null }));
vi.mock('../src/renderer/src/features/settings/MemoryCard', () => ({ MemoryCard: () => null }));
vi.mock('../src/renderer/src/features/settings/ClaudeKeyField', () => ({ ClaudeKeyField: () => null }));

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'jobpilot');
});

function mount() {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as never;
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/', '/settings']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Settings sheet Escape', () => {
  it('a window-level Escape does not close it; only the dialog cancel on the topmost layer does', () => {
    mount();
    const sheet = screen.getByRole('dialog', { name: 'Settings', hidden: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('home')).toBeNull();
    // A cancel fired on a nested dialog does not bubble, so it never reaches the sheet.
    const nested = document.createElement('dialog');
    sheet.appendChild(nested);
    fireEvent(nested, new Event('cancel', { cancelable: true }));
    expect(screen.queryByText('home')).toBeNull();
    fireEvent(sheet, new Event('cancel', { cancelable: true }));
    expect(screen.getByText('home')).toBeTruthy();
  });
});
