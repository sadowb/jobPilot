// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LinksStep } from '../src/renderer/src/features/onboarding/LinksStep';
import { FactsStep } from '../src/renderer/src/features/onboarding/FactsStep';
import { setProfileData } from '../src/renderer/src/features/profile/profileStorage';
import { initializeProfile } from '../src/renderer/src/features/profile/startMigration';
import { PROFILE_KEY } from '../src/renderer/src/features/profile/personal';
import type { ProfileData, ProfileSave } from '../src/shared/dto';

beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
});

afterEach(() => {
  cleanup();
  delete (window as unknown as { jobpilot?: unknown }).jobpilot;
});

describe('step 3 copy (#138)', () => {
  it('displays "Add jobs later" without promising a picker', () => {
    const { getByRole, queryByText } = render(
      <MemoryRouter>
        <LinksStep />
      </MemoryRouter>,
    );
    expect(getByRole('heading', { level: 1 }).textContent).toContain('Add jobs later.');
    expect(queryByText('Choose the jobs')).toBeNull();
  });
});

describe('step 4 answers persistence on pick (#131)', () => {
  it('persists choices immediately on pick so Back does not discard them', async () => {
    let savedSection: string | null = null;
    let savedValue: unknown = null;
    (window as unknown as { jobpilot: unknown }).jobpilot = {
      theme: {
        get: async () => ({ source: 'system', dark: false }),
        onChange: () => () => undefined,
      },
      profile: {
        save: async (input: ProfileSave) => {
          savedSection = input.section;
          savedValue = input.value;
          return {
            personal: null,
            markets: [],
            answers: input.value as ProfileData['answers'],
            onboardingCompletedAt: null,
          };
        },
      },
    };
    setProfileData({ personal: null, markets: [], answers: null, onboardingCompletedAt: null });

    const { getByRole } = render(
      <MemoryRouter>
        <FactsStep />
      </MemoryRouter>,
    );

    const radio = getByRole('radio', { name: 'No, I don’t' });
    fireEvent.click(radio);

    expect(savedSection).toBe('answers');
    expect(savedValue).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'sponsorship', default: 'No, I don’t' })]),
    );
  });
});

describe('initializeProfile migration (#135)', () => {
  it('leaves completion inference to main: migrates with a null onboardingCompletedAt', async () => {
    const mockBridge = (migrated: boolean, initialProfile: ProfileData) => {
      let current = initialProfile;
      let isMigrated = migrated;
      return {
        migrationDone: async () => isMigrated,
        get: async () => current,
        save: async (input: ProfileSave) => {
          current = { ...current, [input.section]: input.value };
          return current;
        },
        migrate: async (input: ProfileData) => {
          isMigrated = true;
          current = input;
          return current;
        },
      };
    };

    const emptyStore = {
      getItem: () => null,
      removeItem: () => undefined,
    };

    const bridgeFresh = mockBridge(false, {
      personal: null,
      markets: [],
      answers: null,
      onboardingCompletedAt: null,
    });
    const freshResult = await initializeProfile(bridgeFresh, emptyStore);
    expect(freshResult.onboardingCompletedAt).toBeNull();

    const existingStore = {
      getItem: (key: string) =>
        key === PROFILE_KEY ? JSON.stringify({ firstName: 'Sara', lastName: 'Benali' }) : null,
      removeItem: () => undefined,
    };
    const bridgeExisting = mockBridge(false, {
      personal: null,
      markets: [],
      answers: null,
      onboardingCompletedAt: null,
    });
    const existingResult = await initializeProfile(bridgeExisting, existingStore);
    expect(existingResult.personal?.firstName).toBe('Sara');
    expect(existingResult.onboardingCompletedAt).toBeNull();
  });
});
