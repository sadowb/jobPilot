/** Mood of an agent bot; kept out of the .tsx so plain-TS modules (and their tests) can use it. */
export type AgentState = 'idle' | 'work' | 'need' | 'block' | 'done';
