[Home](https://tailwindcss.com/) v4.3

`⌘K`  `Ctrl K` [Docs](https://tailwindcss.com/docs) [Play](https://play.tailwindcss.com/) [Blog](https://tailwindcss.com/blog) [Showcase](https://tailwindcss.com/showcase) [Partners](https://tailwindcss.com/partners) [Plus](https://tailwindcss.com/plus?ref=top) [GitHub repository](https://github.com/tailwindlabs/tailwindcss)

1. Core concepts
2. Functions and directives

Core concepts

# Functions and directives

A reference for the custom functions and directives Tailwind exposes to your CSS.

## [Directives](https://tailwindcss.com/docs/functions-and-directives\#directives)

Directives are custom Tailwind-specific [at-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule) you can use in your CSS that offer special functionality for Tailwind CSS projects.

### [@import](https://tailwindcss.com/docs/functions-and-directives\#import-directive)

Use the `@import` directive to inline import CSS files, including Tailwind itself:

CSS

```
@import "tailwindcss";
```

### [@theme](https://tailwindcss.com/docs/functions-and-directives\#theme-directive)

Use the `@theme` directive to define your project's custom design tokens, like fonts, colors, and breakpoints:

CSS

```
@theme {  --font-display: "Satoshi", "sans-serif";  --breakpoint-3xl: 120rem;  --color-avocado-100: oklch(0.99 0 0);  --color-avocado-200: oklch(0.98 0.04 113.22);  --color-avocado-300: oklch(0.94 0.11 115.03);  --color-avocado-400: oklch(0.92 0.19 114.08);  --color-avocado-500: oklch(0.84 0.18 117.33);  --color-avocado-600: oklch(0.53 0.12 118.34);  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);  /* ... */}
```

Learn more about customizing your theme in the [theme variables documentation](https://tailwindcss.com/docs/theme).

### [@source](https://tailwindcss.com/docs/functions-and-directives\#source-directive)

Use the `@source` directive to explicitly specify source files that aren't picked up by Tailwind's automatic content detection:

CSS

```
@source "../node_modules/@my-company/ui-lib";
```

Learn more about automatic content detection in the [detecting classes in source files documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files).

### [@utility](https://tailwindcss.com/docs/functions-and-directives\#utility-directive)

Use the `@utility` directive to add custom utilities to your project that work with variants like `hover`, `focus` and `lg`:

CSS

```
@utility tab-4 {  tab-size: 4;}
```

Learn more about registering custom utilities in the [adding custom utilities documentation](https://tailwindcss.com/docs/adding-custom-styles#adding-custom-utilities).

### [@variant](https://tailwindcss.com/docs/functions-and-directives\#variant-directive)

Use the `@variant` directive to apply a Tailwind variant to styles in your CSS:

CSS

```
.my-element {  background: white;  @variant dark {    background: black;  }}
```

Learn more using variants in the [using variants documentation](https://tailwindcss.com/docs/adding-custom-styles#using-variants).

### [@custom-variant](https://tailwindcss.com/docs/functions-and-directives\#custom-variant-directive)

Use the `@custom-variant` directive to add a custom variant in your project:

CSS

```
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

This lets you write utilities `theme-midnight:bg-black` and `theme-midnight:text-white`.

Learn more about adding custom variants in the [adding custom variants documentation](https://tailwindcss.com/docs/adding-custom-styles#adding-custom-variants).

### [@apply](https://tailwindcss.com/docs/functions-and-directives\#apply-directive)

Use the `@apply` directive to inline any existing utility classes into your own custom CSS:

CSS

```
.select2-dropdown {  @apply rounded-b-lg shadow-md;}.select2-search {  @apply rounded border border-gray-300;}.select2-results__group {  @apply text-lg font-bold text-gray-900;}
```

This is useful when you need to write custom CSS (like to override the styles in a third-party library) but still want to work with your design tokens and use the same syntax you’re used to using in your HTML.

### [@reference](https://tailwindcss.com/docs/functions-and-directives\#reference-directive)

If you want to use `@apply` or `@variant` in the `<style>` block of a Vue or Svelte component, or within CSS modules, you will need to import your theme variables, custom utilities, and custom variants to make those values available in that context.

To do this without duplicating any CSS in your output, use the `@reference` directive to import your main stylesheet for reference without actually including the styles:

Vue

```
<template>  <h1>Hello world!</h1></template><style>  @reference "../../app.css";  h1 {    @apply text-2xl font-bold text-red-500;  }</style>
```

If you’re just using the default theme with no customizations (e.g. by using things like `@theme`, `@custom-variant`, `@plugin`, etc…), you can import `tailwindcss` directly:

Vue

```
<template>  <h1>Hello world!</h1></template><style>  @reference "tailwindcss";  h1 {    @apply text-2xl font-bold text-red-500;  }</style>
```

### [Subpath Imports](https://tailwindcss.com/docs/functions-and-directives\#subpath-imports)

When using the CLI, Vite, or PostCSS the directives `@import`, `@reference`, `@plugin`, and `@config` all support [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) which work similarly to bundler and TypeScript path aliases:

package.json

```
{  // ...  "imports": {    "#app.css": "./src/css/app.css"  }}
```

Vue

```
<template>  <h1>Hello world!</h1></template><style>  @reference "#app.css";  h1 {    @apply text-2xl font-bold text-red-500;  }</style>
```

## [Functions](https://tailwindcss.com/docs/functions-and-directives\#functions)

Tailwind provides the following build-time functions to make working with colors and the spacing scale easier.

### [--alpha()](https://tailwindcss.com/docs/functions-and-directives\#alpha-function)

Use the `--alpha()` function to adjust the opacity of a color:

Input CSS

```
.my-element {  color: --alpha(var(--color-lime-300) / 50%);}
```

Compiled CSS

```
.my-element {  color: color-mix(in oklab, var(--color-lime-300) 50%, transparent);}
```

### [--spacing()](https://tailwindcss.com/docs/functions-and-directives\#spacing-function)

Use the `--spacing()` function to generate a spacing value based on your theme:

Input CSS

```
.my-element {  margin: --spacing(4);}
```

Compiled CSS

```
.my-element {  margin: calc(var(--spacing) * 4);}
```

This can also be useful in arbitrary values, especially in combination with `calc()`:

HTML

```
<div class="py-[calc(--spacing(4)-1px)]">  <!-- ... --></div>
```

## [Compatibility](https://tailwindcss.com/docs/functions-and-directives\#compatibility)

The following directives and functions exist solely for compatibility with Tailwind CSS v3.x.

The `@config` and `@plugin` directives may be used in conjunction with `@theme`, `@utility`, and other CSS-driven features. This can be used to incrementally move over your theme, custom configuration, utilities, variants, and presets to CSS. Things defined in CSS will be merged where possible and otherwise take precedence over those defined in configs, presets, and plugins.

### [@config](https://tailwindcss.com/docs/functions-and-directives\#config-directive)

Use the `@config` directive to load a legacy JavaScript-based configuration file:

CSS

```
@config "../../tailwind.config.js";
```

The `corePlugins`, `safelist`, and `separator` options from the JavaScript-based config are not supported in v4.0. To safelist utilities in v4 use [`@source inline()`](https://tailwindcss.com/docs/detecting-classes-in-source-files#safelisting-specific-utilities).

### [@plugin](https://tailwindcss.com/docs/functions-and-directives\#plugin-directive)

Use the `@plugin` directive to load a legacy JavaScript-based plugin:

CSS

```
@plugin "@tailwindcss/typography";
```

The `@plugin` directive accepts either a package name or a local path.

### [theme()](https://tailwindcss.com/docs/functions-and-directives\#theme-function)

Use the `theme()` function to access your Tailwind theme values using dot notation:

CSS

```
.my-element {  margin: theme(spacing.12);}
```

This function is deprecated, and we recommend [using CSS theme variables](https://tailwindcss.com/docs/theme#using-your-theme-variables) instead.

### On this page

- [Directives](https://tailwindcss.com/docs/functions-and-directives#directives)
  - [Subpath Imports](https://tailwindcss.com/docs/functions-and-directives#subpath-imports)
- [Functions](https://tailwindcss.com/docs/functions-and-directives#functions)
- [Compatibility](https://tailwindcss.com/docs/functions-and-directives#compatibility)

[![Refactoring UI](https://tailwindcss.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fbook-promo.0xtl10.r4k91k.png&w=256&q=75)\\
\\
From the creators of Tailwind CSS\\
\\
Make your ideas look awesome, without relying on a designer.\\
\\
> “This is the survival kit I wish I had when I started building apps.”\\
> \\
> Derrick Reimer, SavvyCal](https://www.refactoringui.com/?ref=sidebar)

Copyright © 2026 Tailwind Labs Inc.· [Trademark Policy](https://tailwindcss.com/brand)