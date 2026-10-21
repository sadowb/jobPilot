/** Join class names, skipping falsy entries. No dependency: Tailwind utilities never need merging here. */
export const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');
