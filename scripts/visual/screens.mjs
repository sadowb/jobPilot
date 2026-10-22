/**
 * Declarative screen list for scripts/visual/capture.mjs.
 *
 * Action shapes (selectors are Playwright selector strings, e.g. `role=button[name="Edit contact"]`):
 *   { click: selector }            click the element
 *   { fill: [selector, text] }     fill an input
 *   { press: key }                 keyboard press, e.g. 'Control+k'
 *   { waitFor: selector }          wait until visible
 *   { event: [name, detail] }      dispatch a window CustomEvent
 *   { wait: ms }                   fixed pause (animations are reduced, so rarely needed)
 *
 * @typedef {{ click: string } | { fill: [string, string] } | { press: string } | { waitFor: string } | { event: [string, unknown] } | { wait: number }} Action
 * @typedef {{ name: string, route: string, width?: number, actions?: Action[] }} Screen
 */

/** @type {Screen[]} */
export const SCREENS = [
  { name: 'dashboard-applied', route: '/' },
  { name: 'dashboard-up-next', route: '/?tab=up-next' },
  {
    name: 'dashboard-peek',
    route: '/',
    actions: [{ click: '[data-row-id] >> nth=0' }, { waitFor: '[aria-label="Application peek"]' }],
  },
  {
    name: 'dashboard-cv-viewer',
    route: '/',
    actions: [
      { click: '[data-row-id] >> nth=0' },
      { click: 'role=button[name="View full size"]' },
      { waitFor: 'role=dialog' },
    ],
  },
  {
    name: 'dashboard-add-jobs',
    route: '/',
    actions: [{ click: 'role=button[name=/Add jobs/]' }, { waitFor: 'role=dialog' }],
  },
  {
    name: 'dashboard-add-jobs-pasted',
    route: '/',
    actions: [
      { click: 'role=button[name=/Add jobs/]' },
      {
        fill: [
          'textarea',
          'https://jobs.ashbyhq.com/example/1\nhttps://boards.greenhouse.io/example/jobs/2\nhttps://example.com/not-a-job',
        ],
      },
      { wait: 1500 },
    ],
  },
  { name: 'first-day', route: '/first-day' },
  { name: 'inbox', route: '/inbox' },
  { name: 'fixes', route: '/fixes' },
  { name: 'analytics', route: '/analytics' },
  { name: 'profile-about', route: '/profile?section=about' },
  { name: 'profile-documents', route: '/profile?section=documents' },
  { name: 'profile-answers', route: '/profile?section=answers' },
  { name: 'profile-knowledge', route: '/profile?section=knowledge' },
  {
    name: 'profile-editor-contact',
    route: '/profile',
    actions: [{ click: 'role=button[name="Edit contact"]' }, { waitFor: 'role=dialog' }],
  },
  {
    name: 'profile-editor-job-preferences',
    route: '/profile',
    actions: [{ click: 'role=button[name="Edit job preferences"]' }, { waitFor: 'role=dialog' }],
  },
  {
    name: 'profile-editor-languages',
    route: '/profile',
    actions: [{ click: 'role=button[name="Edit languages and links"]' }, { waitFor: 'role=dialog' }],
  },
  {
    name: 'profile-editor-country-us',
    route: '/profile',
    actions: [{ event: ['jobpilot:open-editor', { kind: 'market', code: 'US' }] }, { waitFor: 'role=dialog' }],
  },
  { name: 'settings', route: '/settings' },
  { name: 'welcome-1', route: '/welcome/1' },
  { name: 'welcome-2', route: '/welcome/2' },
  { name: 'welcome-3', route: '/welcome/3' },
  { name: 'welcome-4', route: '/welcome/4' },
  { name: 'welcome-5', route: '/welcome/5' },
  { name: 'extension', route: '/extension' },
  {
    name: 'cmdk',
    route: '/',
    actions: [{ press: 'Control+k' }, { waitFor: 'role=dialog' }],
  },
  { name: 'dashboard-narrow', route: '/', width: 900 },
  { name: 'profile-narrow', route: '/profile', width: 900 },
];
