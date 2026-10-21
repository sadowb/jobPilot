import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = JSON.parse(readFileSync('design/tokens.json', 'utf8')) as {
  light: Record<string, string>;
  dark: Record<string, string>;
};
const css = readFileSync('src/renderer/src/styles/tokens.css', 'utf8');

describe('design tokens', () => {
  it('every V17 light token is emitted by the generated stylesheet with the same value', () => {
    for (const [name, value] of Object.entries(tokens.light)) expect(css).toContain(`${name}: ${value};`);
  });
  it('every V17 dark token is emitted under .dark', () => {
    const dark = css.slice(css.indexOf('.dark {'));
    for (const [name, value] of Object.entries(tokens.dark)) expect(dark).toContain(`${name}: ${value};`);
  });
});
