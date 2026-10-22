# Shared UI primitives

Import from `components/ui`. **feature code uses these + Tailwind utilities; no new feature .css files**.
Colors follow the existing tokens and the `.dark` class on `<html>`. No inline styles or runtime CSS are needed.

| Primitive                     | Props / purpose                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                      | Native button props; `variant`: default, primary, ghost, danger, danger-fill; `size`: md, sm, icon, icon-sm.                                                                                                                                                                                                                                                                                                                           |
| `Card`                        | Div props; `tone`: default or panel.                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Tile`                        | Span props; `size`: sm, md, lg.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Status`                      | Span props; `kind`: work, need, done, idle, bad, plain.                                                                                                                                                                                                                                                                                                                                                                                |
| `Kbd`, `Eyebrow`              | Native element props for keyboard shortcuts and mono labels.                                                                                                                                                                                                                                                                                                                                                                           |
| `Field`                       | Div props plus `label`, optional `hint`, `error`, `wide`, and one child control. Generates IDs with `useId`, preserves explicit child IDs and ARIA descriptions, wires label/hint/error, and sets `aria-invalid` for an error. Custom child components must forward ID/ARIA props.                                                                                                                                                     |
| `FieldGrid`                   | Div props; two columns, 20px row / 16px column gaps; one column at viewport widths ≤800px. `Field wide` spans the row.                                                                                                                                                                                                                                                                                                                 |
| `Input`, `Textarea`           | Native props and forwarded refs. 44px minimum, 12px radius, 11px × 13px padding. Textarea resizes vertically.                                                                                                                                                                                                                                                                                                                          |
| `Select`                      | Native select props and forwarded ref; `size="md"` (default) or `"sm"` (38px, 10px radius, language-row spacing). `className` styles its wrapper; `controlClassName` styles the native select. Defaults to full width; use `className="w-auto min-w-28 flex-none"` for a salary period. Native numeric `size` is replaced by the visual size prop.                                                                                     |
| `Segmented<T extends string>` | Controlled `value`, `onChange`, readonly `options` (`value`, `label`, optional `disabled`), optional group `disabled`, div/ARIA props, `className`. Supply `label`/`aria-label`/`aria-labelledby`, or wrap in `Field`. Equal-width pill radios; arrows wrap and skip disabled options, Home/End jump, Space/Enter activate native buttons.                                                                                             |
| `Dialog`                      | Controlled `open`, `onClose` (set open=false), `title`, `children`; optional `titleAdornment`, `eyebrow`, `description`, `note`, `actions`, `onSubmit`, `closeLabel`, `className`, `bodyClassName`. Default eyebrow: “Profile & documents”; default action: Done. Keep mounted while toggling `open`. Put controls directly in its body: it already owns a form. Submit actions call `onSubmit`; without it submission requests close. |
| `cx`                          | Joins class strings, skipping falsy values; does not resolve conflicting utilities.                                                                                                                                                                                                                                                                                                                                                    |

```tsx
<FieldGrid>
  <Field label="Name" hint="As it appears on your CV" error={errors.name}>
    <Input name="name" value={name} onChange={(event) => setName(event.target.value)} />
  </Field>
  <Field label="About you" wide>
    <Textarea name="bio" rows={4} />
  </Field>
</FieldGrid>
```

For salary rows, compose `flex gap-2`, an `Input` with `flex-1 min-w-0`, and an auto-width `Select`.
For language rows use `grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_repeat(3,36px)] gap-2.5 items-center py-[5px]` and `Select size="sm"`.
For compound controls inside `Field`, forward its ID and ARIA props to the primary input or named group.

Dialog uses native `showModal()`/`close()` for focus containment and Escape, closes on backdrop clicks,
returns focus to the opener, and locks body scrolling while open (including overlapping dialogs).
It matches the profile editor's 640px width, header/body/footer spacing, 220ms rise and 160ms scrim fade.
Reduced motion disables both animations. The reference has **no exit animation**, so closing is immediate.

Reference differences required by this API: `FieldGrid` collapses at the profile's 800px breakpoint
(the original `.profile-fields` itself has no collapse rule); the inline select chevron uses `--muted`
instead of the old SVG's fixed `#8C8C8C`. Dialog's eyebrow intentionally copies `.v17x` (11px/0.06em),
which differs from the existing `Eyebrow` primitive. Focus is explicitly 2px ink with 2px offset;
important utilities prevent the unlayered global 3px focus and button font/color rules from overriding it.
