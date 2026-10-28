// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterChips } from '../../src/renderer/src/features/dashboard/components/FilterChips';
import { MetricRow } from '../../src/renderer/src/features/dashboard/components/MetricRow';

afterEach(() => {
  cleanup();
});

describe('MetricRow stat card labels (#133)', () => {
  it('renders distinct sub-labels for Interviews and Offers stat cards', () => {
    const stats = [
      { label: 'APPLIED', value: '10', sub: 'Applications sent' },
      { label: 'INTERVIEWS', value: '2', sub: 'Scheduled' },
      { label: 'OFFERS', value: '1', sub: 'Received' },
    ];
    render(<MetricRow stats={stats} />);

    expect(screen.getByText('Applications sent')).toBeDefined();
    expect(screen.getByText('Scheduled')).toBeDefined();
    expect(screen.getByText('Received')).toBeDefined();
    expect(screen.queryByText('Current status')).toBeNull();
  });
});

describe('FilterChips wrapping (#134)', () => {
  it('uses flex-wrap so chips wrap without clipping', () => {
    const counts = {
      all: 7,
      submitted: 2,
      screening: 1,
      interview: 1,
      offer: 1,
      rejected: 1,
      withdrawn: 1,
    };
    const { container } = render(<FilterChips counts={counts} active="all" onChange={vi.fn()} />);

    const group = container.querySelector('[role="group"]');
    expect(group?.className).toContain('flex-wrap');
    expect(group?.className).not.toContain('min-w-max');
  });
});
