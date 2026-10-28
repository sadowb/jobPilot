// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusMenu } from '../../src/renderer/src/features/dashboard/components/StatusMenu';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StatusMenu', () => {
  it('renders a real input showing typed text and filters statuses', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<StatusMenu current="submitted" cursor={0} onPick={onPick} onClose={onClose} />);

    const input = screen.getByRole('textbox', { name: 'Filter statuses' });
    expect(input).toBeDefined();
    expect(input.getAttribute('placeholder')).toBe('Filter statuses…');

    // Initially all groups and statuses are shown
    expect(screen.getByText('Submitted')).toBeDefined();
    expect(screen.getByText('Offer')).toBeDefined();

    // Type "offer" into the input
    fireEvent.change(input, { target: { value: 'offer' } });
    expect((input as HTMLInputElement).value).toBe('offer');

    // Only Offer matches
    expect(screen.queryByText('Submitted')).toBeNull();
    expect(screen.getByText('Offer')).toBeDefined();
  });

  it('shows empty message when no status matches', () => {
    render(<StatusMenu current="submitted" cursor={0} onPick={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Filter statuses' });

    fireEvent.change(input, { target: { value: 'remote' } });
    expect(screen.getByText('No matching status')).toBeDefined();
  });

  it('navigates with arrows and selects with Enter', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<StatusMenu current="submitted" cursor={0} onPick={onPick} onClose={onClose} />);
    const input = screen.getByRole('textbox', { name: 'Filter statuses' });

    // Arrow down moves cursor
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onPick).toHaveBeenCalledWith('screening');
  });

  it('Enter picks the filtered status when query is active', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<StatusMenu current="submitted" cursor={0} onPick={onPick} onClose={onClose} />);
    const input = screen.getByRole('textbox', { name: 'Filter statuses' });

    fireEvent.change(input, { target: { value: 'off' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onPick).toHaveBeenCalledWith('offer');
  });

  it('Escape closes the status menu', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<StatusMenu current="submitted" cursor={0} onPick={onPick} onClose={onClose} />);
    const input = screen.getByRole('textbox', { name: 'Filter statuses' });

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking an option picks that status', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<StatusMenu current="submitted" cursor={0} onPick={onPick} onClose={onClose} />);

    fireEvent.click(screen.getByText('Offer'));
    expect(onPick).toHaveBeenCalledWith('offer');
  });
});
