import type { Application } from './types';

export interface CvLine {
  text: string;
  /** Present when the current CV words this line differently from the sent one (drawn with the brand bar). */
  currentText?: string;
}

export interface CvEntry {
  title: string;
  when: string;
  lines: CvLine[];
}

export interface CvSection {
  heading: string;
  /** Titled entries (education, experience, projects). */
  entries?: CvEntry[];
  /** Bare lines (skills, languages). */
  lines?: CvLine[];
}

export interface CvDocument {
  name: string;
  headline: string;
  sections: CvSection[];
}

export interface SentCv {
  fileName: string;
  sentAt: string;
  jobTitle: string;
  fileMeta: string;
  checksum: string;
  /** Server-computed summary of how today's CV differs from the sent one, one line each. */
  changes: string[];
  document: CvDocument;
}

/** The user's CV as the V17 board draws it. Placeholder text; replaced by the parsed CV once Onboarding stores it. */
export const SAMPLE_CV: CvDocument = {
  name: 'Sara Benali',
  headline: 'Software engineer · Rabat, Morocco · linkedin.com/in/sara-benali-example',
  sections: [
    {
      heading: 'Education',
      entries: [
        {
          title: 'Mohammed V University, Rabat',
          when: '2022 – 2026',
          lines: [
            {
              text: 'B.Sc. Computer Science. Algorithms, operating systems, databases, machine learning, computer networks.',
            },
          ],
        },
      ],
    },
    {
      heading: 'Experience',
      entries: [
        {
          title: 'Teaching assistant · Introduction to Programming (C++)',
          when: '2025 – 2026',
          lines: [
            {
              text: 'Ran two lab sections of 24 students. Wrote autograder tests in Python and reviewed 300+ assignments.',
            },
          ],
        },
      ],
    },
    {
      heading: 'Projects',
      entries: [
        {
          title: 'JobPilot · local job-application agent',
          when: '2026',
          lines: [
            {
              text: 'Built a local agent that fills applications with browser workers, drafts answers for review and tracks status in SQLite.',
              currentText:
                'Built a local agent that fills applications with browser workers, drafts answers for review and tracks status in SQLite, with a React dashboard.',
            },
          ],
        },
        {
          title: 'Darija sentiment classifier · PyTorch',
          when: '2025',
          lines: [
            {
              text: 'Fine-tuned multilingual BERT on 40k code-switched posts (Darija, French, English). 0.87 macro-F1 on held-out data.',
            },
          ],
        },
        {
          title: 'Campus shuttle ETA · Flask, PostgreSQL',
          when: '2024',
          lines: [
            {
              text: 'REST service that turns GPS pings into arrival estimates for the campus shuttle, with a React Native client.',
            },
          ],
        },
      ],
    },
    {
      heading: 'Skills',
      lines: [
        {
          text: 'Python · TypeScript · SQL · PyTorch · Git · Linux',
          currentText: 'Python · TypeScript · SQL · PyTorch · Git · Linux · Docker',
        },
      ],
    },
    {
      heading: 'Languages',
      lines: [{ text: 'Arabic (native) · Darija (native) · French (professional) · English (professional)' }],
    },
  ],
};

/** The CV the agent pinned when it submitted `app`. Sample data pins the same document for every row. */
export function sentCvFor(app: Application): SentCv {
  return {
    fileName: app.detail.cvName,
    sentAt: 'Oct 17, 2026 · 09:31',
    jobTitle: `${app.role} · ${app.company}`,
    fileMeta: '1 page · PDF · 212 KB',
    checksum: 'sha 3f9c…',
    changes: ['Skills · adds Docker', 'Projects · JobPilot bullet adds React dashboard'],
    document: SAMPLE_CV,
  };
}
