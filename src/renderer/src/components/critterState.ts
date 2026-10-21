/** Agent critter state: drives art, motion and the badge (see CritterBot). Plain module so logic and tests can import it. */
export type CritterState = 'need' | 'block' | 'work' | 'idle' | 'done';
