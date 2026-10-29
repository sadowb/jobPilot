// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicationListItem } from '../src/shared/dto';
import { CommandBoxHost, openCommandBox } from '../src/renderer/src/features/cmdk/CommandBoxHost';
import { queryClient } from '../src/renderer/src/lib/query';

const ID = '01HZZZZZZZZZZZZZZZZZZZZZZZ';
const application = (over: Partial<ApplicationListItem> = {}): ApplicationListItem => ({
  id: ID,
  status: 'applied',
  queueRank: 1,
  appliedAt: 1_760_000_000_000,
  lastActivityAt: 0,
  createdAt: 0,
  cvVersionId: null,
  postingId: 'p1',
  title: 'Backend Engineer',
  location: 'Remote',
  url: 'https://jobs.lever.co/acme/1',
  companyId: 'c1',
  companyName: 'Acme',
  latestRunId: null,
  latestRunStatus: null,
  latestRunAgent: null,
  ...over,
});

const setStatus = vi.fn();
const list = vi.fn();
beforeEach(() => {
  queryClient.clear();
  setStatus.mockReset().mockResolvedValue(application({ status: 'interviewing' }));
  window.jobpilot = {
    applications: { list: list.mockResolvedValue([application()]), setStatus },
  } as never;
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'jobpilot');
});

const mount = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommandBoxHost />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('CommandBoxHost', () => {
  it('finds real applications and applies "set X to Interview" through the status mutation', async () => {
    mount();
    act(() => openCommandBox());
    const box = await screen.findByRole('combobox', { name: 'Ask Cap or search jobs' });
    await waitFor(() => expect(list).toHaveBeenCalled());
    fireEvent.change(box, { target: { value: 'set acme to interview' } });
    const action = await screen.findByText('Set Acme → Interview');
    fireEvent.click(action);
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith({ id: ID, status: 'interviewing' }));
  });

  it('tells the owner when the status could not be changed', async () => {
    setStatus.mockRejectedValue(new Error('nope'));
    mount();
    act(() => openCommandBox());
    const box = await screen.findByRole('combobox', { name: 'Ask Cap or search jobs' });
    await waitFor(() => expect(list).toHaveBeenCalled());
    fireEvent.change(box, { target: { value: 'set acme to offer' } });
    fireEvent.click(await screen.findByText('Set Acme → Offer'));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Could not change that status.');
  });
});
