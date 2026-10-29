// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TabSwitch, type DashboardTab } from '../src/renderer/src/features/dashboard/components/TabSwitch';
import { LimitField } from '../src/renderer/src/features/settings/LimitField';
import { LIMIT_SPECS } from '../src/renderer/src/features/settings/model';

afterEach(cleanup);

const cost = LIMIT_SPECS.find((s) => s.key === 'costPerDay')!;

describe('LimitField (strict input)', () => {
  const setup = () => {
    const onChange = vi.fn();
    render(<LimitField spec={cost} value={5} onChange={onChange} />);
    return { onChange, input: screen.getByRole('textbox', { name: /Cost limit/ }) };
  };

  it('shows an inline error and saves nothing for "2.5", "1e3" and "-5"', () => {
    const { onChange, input } = setup();
    for (const raw of ['2.5', '1e3', '-5']) {
      fireEvent.change(input, { target: { value: raw } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByRole('alert').textContent).toContain('whole number from 1 to 1000');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits a valid whole number and clears the error', () => {
    const { onChange, input } = setup();
    fireEvent.change(input, { target: { value: '2.5' } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: '25' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(25);
  });
});

describe('dashboard tablist', () => {
  function Dashboard() {
    const [tab, setTab] = useState<DashboardTab>('applied');
    // Like the real dashboard, each tab swaps the whole view, so the tablist remounts.
    return (
      <div key={tab}>
        <TabSwitch active={tab} appliedCount={1} upNextCount={2} onChange={setTab} />
        <div role="tabpanel" id={`dashboard-panel-${tab}`} aria-labelledby={`dashboard-tab-${tab}`} />
      </div>
    );
  }

  it('keeps focus on the newly selected tab after the view remounts', () => {
    render(<Dashboard />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Applied/ }), { key: 'ArrowRight' });
    const upNext = screen.getByRole('tab', { name: /Up next/ });
    expect(document.activeElement).toBe(upNext);
    expect(upNext.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(upNext, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Applied/ }));
  });

  it('links each tab to its tabpanel', () => {
    render(<Dashboard />);
    const tab = screen.getByRole('tab', { name: /Applied/ });
    const panel = screen.getByRole('tabpanel');
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
  });
});
