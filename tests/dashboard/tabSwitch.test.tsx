// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchField } from '../../src/renderer/src/features/dashboard/components/SearchField';
import { TabSwitch } from '../../src/renderer/src/features/dashboard/components/TabSwitch';

afterEach(() => {
  cleanup();
});

describe('TabSwitch accessibility (#62)', () => {
  it('renders a tablist container with proper aria-label', () => {
    render(<TabSwitch active="applied" appliedCount={5} upNextCount={2} onChange={vi.fn()} />);
    const tablist = screen.getByRole('tablist', { name: 'Dashboard view' });
    expect(tablist).toBeDefined();
  });

  it('renders tabs with role="tab", aria-selected, and roving tabIndex', () => {
    render(<TabSwitch active="applied" appliedCount={5} upNextCount={2} onChange={vi.fn()} />);
    const appliedTab = screen.getByRole('tab', { name: /Applied/ });
    const upNextTab = screen.getByRole('tab', { name: /Up next/ });

    expect(appliedTab.getAttribute('aria-selected')).toBe('true');
    expect(appliedTab.getAttribute('tabindex')).toBe('0');

    expect(upNextTab.getAttribute('aria-selected')).toBe('false');
    expect(upNextTab.getAttribute('tabindex')).toBe('-1');
  });

  it('navigates between tabs using ArrowRight and ArrowLeft', () => {
    const onChange = vi.fn();
    render(<TabSwitch active="applied" appliedCount={5} upNextCount={2} onChange={onChange} />);
    const appliedTab = screen.getByRole('tab', { name: /Applied/ });

    fireEvent.keyDown(appliedTab, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('up-next');

    onChange.mockClear();
    fireEvent.keyDown(appliedTab, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('up-next');
  });

  it('supports Home and End keys to navigate tabs', () => {
    const onChange = vi.fn();
    render(<TabSwitch active="applied" appliedCount={5} upNextCount={2} onChange={onChange} />);
    const appliedTab = screen.getByRole('tab', { name: /Applied/ });

    fireEvent.keyDown(appliedTab, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('up-next');

    onChange.mockClear();
    fireEvent.keyDown(appliedTab, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('applied');
  });

  it('activates tabs on Enter or Space key', () => {
    const onChange = vi.fn();
    render(<TabSwitch active="applied" appliedCount={5} upNextCount={2} onChange={onChange} />);
    const upNextTab = screen.getByRole('tab', { name: /Up next/ });

    fireEvent.keyDown(upNextTab, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('up-next');

    onChange.mockClear();
    fireEvent.keyDown(upNextTab, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith('up-next');
  });
});

describe('SearchField focus visibility (#62)', () => {
  it('gives the input a visible focus ring class and does not suppress outline', () => {
    render(<SearchField value="" onChange={vi.fn()} />);
    const input = screen.getByRole('searchbox', { name: 'Search applications' });

    expect(input.className).toContain('focus:outline-2!');
    expect(input.className).toContain('focus:outline-ink!');
    expect(input.className).not.toContain('outline-0');
    expect(input.className).not.toContain('focus-visible:outline-0');
  });
});
