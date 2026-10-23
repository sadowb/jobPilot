import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const renderer = join(process.cwd(), 'src/renderer');
const allowed = new Set([
  'src/renderer/src/styles/index.css',
  'src/renderer/src/styles/tokens.css',
  'src/renderer/src/styles/fonts.css',
]);

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
    const root = postcss.parse(source);
    const allowedBase = new Set(['html, body, #root', 'body', 'button', 'a', ':focus-visible', '::selection', '*, *::before, *::after']);
    const selectors: string[] = [];
    const visit = (node: postcss.Container, inBase = false) => {
      node.nodes?.forEach((child) => {
        if (child.type === 'atrule' && child.name === 'keyframes') return;
        if (child.type === 'rule') {
          const selector = child.selector.replace(/\s+/g, ' ').trim();
          selectors.push(selector);
          if (inBase) expect(allowedBase.has(selector)).toBe(true);
          else expect.fail(`selector outside @theme or @layer base: ${selector}`);
        }
        if (child.type === 'atrule' && child.nodes) {
          if (child.name === 'media') {
            expect(inBase && child.params === '(prefers-reduced-motion: reduce)').toBe(true);
          } else {
            expect(child.name === 'theme' || child.name === 'layer').toBe(true);
            if (child.name === 'layer') expect(child.params).toBe('base');
          }
          visit(child, inBase || (child.name === 'layer' && child.params === 'base'));
        } else if (child.type === 'rule') {
          visit(child, inBase);
        }
      });
    };
    visit(root);
  });
});
