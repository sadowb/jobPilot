import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const renderer = join(process.cwd(), 'src/renderer');
const allowed = new Set(['src/renderer/src/styles/index.css', 'src/renderer/src/styles/tokens.css', 'src/renderer/src/styles/fonts.css']);

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe('renderer stylesheet policy', () => {
  it('keeps only the Tailwind entry, design tokens, and font imports', () => {
    const cssFiles = filesUnder(renderer).filter((path) => path.endsWith('.css'));
    expect(cssFiles.map((path) => relative(process.cwd(), path)).sort()).toEqual([...allowed].sort());
  });

  it('imports renderer CSS only from the main Tailwind entry', () => {
    const sources = filesUnder(renderer).filter((path) => /\.[jt]sx?$/.test(path));
    const imports = sources.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return [...source.matchAll(/(?:import\s+(?:[^'";]+\s+from\s+)?|import\s*\()\s*['"]([^'"]+\.css)['"]/g)].map(
        (match) => ({ path: relative(process.cwd(), path), specifier: match[1] }),
      );
    });
    expect(imports).toEqual([{ path: 'src/renderer/src/main.tsx', specifier: './styles/index.css' }]);
  });

  it('has no class selectors in the entry stylesheet outside Tailwind directives', () => {
    const source = readFileSync(join(renderer, 'src/styles/index.css'), 'utf8');
    const withoutTheme = source.replace(/@theme(?:\s+inline)?\s*\{[\s\S]*?\n\}/g, '');
    const withoutCustomVariant = withoutTheme.replace(/@custom-variant[^;]+;/g, '');
    expect(withoutCustomVariant).not.toMatch(/(^|[},\s])\.[A-Za-z_-][\w-]*/m);
  });
});
