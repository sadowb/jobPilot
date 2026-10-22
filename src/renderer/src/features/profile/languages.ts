export const LEVELS = ['Native', 'Fluent', 'Professional', 'Basic'] as const;
export type LanguageLevel = (typeof LEVELS)[number];

export interface LanguageEntry {
  id: string;
  /** ISO 639-1 code ('fr'). Empty only for an entry that could not be parsed. */
  language: string;
  level: LanguageLevel | '';
  /** The original text of an entry that could not be parsed. Shown as "Check this" until resolved. */
  raw?: string;
}

const MAX_ENTRIES = 60;

/** ISO 639-1 codes offered in the language select. Names come from Intl.DisplayNames. */
const CODES =
  'af am ar as az be bg bn bs ca cs cy da de el en eo es et eu fa fi fo fr ga gl gu he hi hr hu hy id is it ja ka kk km kn ko ku ky lb lo lt lv mg mk ml mn mr ms mt my nb ne nl nn no oc or pa pl ps pt qu ro ru rw sa sd si sk sl so sq sr sv sw ta te tg th ti tk tl tr tt ug uk ur uz vi wo xh yi yo zh zu'.split(
    ' ',
  );

let displayNames: Intl.DisplayNames | null | undefined;
function names(): Intl.DisplayNames | null {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' });
    } catch {
      displayNames = null;
    }
  }
  return displayNames;
}

export function languageName(code: string): string {
  try {
    return names()?.of(code) ?? code;
  } catch {
    return code;
  }
}

let options: { code: string; name: string }[] | undefined;
export function languageOptions(): readonly { code: string; name: string }[] {
  options ??= CODES.map((code) => ({ code, name: languageName(code) })).sort((a, b) => a.name.localeCompare(b.name));
  return options;
}

const LANGUAGE_ALIASES: Record<string, string> = {
  mandarin: 'zh',
  chinese: 'zh',
  darija: 'ar',
  moroccan: 'ar',
  'modern standard arabic': 'ar',
  castilian: 'es',
  farsi: 'fa',
  persian: 'fa',
  flemish: 'nl',
  filipino: 'tl',
  tagalog: 'tl',
};

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

let byName: Map<string, string> | undefined;
/** "French", "français", "fr" → "fr". Undefined when unknown. */
export function matchLanguage(text: string): string | undefined {
  const key = fold(text);
  if (!key) return undefined;
  if (!byName) {
    byName = new Map(languageOptions().map((o) => [fold(o.name), o.code]));
    for (const [alias, code] of Object.entries(LANGUAGE_ALIASES)) byName.set(alias, code);
  }
  return byName.get(key) ?? (CODES.includes(key) ? key : undefined);
}

const LEVEL_ALIASES: Record<string, LanguageLevel> = {
  native: 'Native',
  'mother tongue': 'Native',
  bilingual: 'Native',
  fluent: 'Fluent',
  advanced: 'Fluent',
  professional: 'Professional',
  'full professional': 'Professional',
  'professional working': 'Professional',
  proficient: 'Professional',
  working: 'Professional',
  intermediate: 'Professional',
  basic: 'Basic',
  beginner: 'Basic',
  elementary: 'Basic',
  conversational: 'Basic',
};

export function matchLevel(text: string): LanguageLevel | undefined {
  return LEVEL_ALIASES[fold(text)];
}

let counter = 0;
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `lang-${++counter}`;

/**
 * Legacy free text → entries. "French (Professional), Arabic - Native, English: Fluent".
 * Anything that is not a known language (or has an unknown level) is kept whole as a flagged entry.
 */
export function parseLanguageText(text: string): LanguageEntry[] {
  return text
    .split(/[,;\n]/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece): LanguageEntry => {
      const m = /^(.+?)\s*(?:\(([^)]*)\)|[:\-–—]\s*(.+))?$/.exec(piece);
      const name = m?.[1]?.trim() ?? piece;
      const levelText = (m?.[2] ?? m?.[3] ?? '').trim();
      const language = matchLanguage(name);
      const level = levelText ? matchLevel(levelText) : '';
      if (language && level !== undefined) return { id: newId(), language, level };
      return { id: newId(), language: '', level: '', raw: piece };
    });
}

/** Strict reader for the persisted list. Throws on anything malformed. */
export function parseLanguages(value: unknown): LanguageEntry[] {
  if (!Array.isArray(value) || value.length > MAX_ENTRIES) throw new Error('Invalid languages');
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid language entry');
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id || ids.has(r.id)) throw new Error('Invalid language entry');
    ids.add(r.id);
    if (typeof r.language !== 'string' || r.language.length > 20) throw new Error('Invalid language entry');
    if (r.level !== '' && !LEVELS.includes(r.level as LanguageLevel)) throw new Error('Invalid language level');
    if (r.raw !== undefined && (typeof r.raw !== 'string' || r.raw.length > 200))
      throw new Error('Invalid language entry');
    if (!r.language && r.raw === undefined) throw new Error('Language entry has no language');
    const entry: LanguageEntry = { id: r.id, language: r.language, level: r.level as LanguageLevel | '' };
    if (r.raw !== undefined) entry.raw = r.raw;
    return entry;
  });
}

/** A problem that blocks saving, or null. Flagged entries must be resolved or removed first. */
export function languagesError(entries: readonly LanguageEntry[]): string | null {
  if (entries.some((e) => !e.language)) return 'Choose a language for every entry, or remove it.';
  const codes = entries.map((e) => e.language);
  return new Set(codes).size === codes.length ? null : 'Each language can be listed once.';
}
