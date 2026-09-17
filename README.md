# 🎨 Palette Generator

[![Test and deploy](https://github.com/mchamow/002-palette-generator/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/002-palette-generator/actions/workflows/deploy.yml)

**Day 2 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: generate harmonious five-color palettes and see at a glance whether text is readable on each color.

**Live demo:** https://mchamow.github.io/002-palette-generator/

## Features

- Four color-harmony modes: analogous, complementary, triadic and monochrome
- Every palette runs from dark to light, so it's usable for real UI
- Lock the colors you like; the next palette keeps them and builds its hues around the first locked one
- Fine-tune any color with the color picker (edited colors are locked automatically)
- WCAG contrast ratio and rating (AAA / AA / AA Large / Fail) for white and black text on every color, with the hex code shown in whichever of the two reads better
- Click a hex code to copy it, or copy the whole palette as CSS custom properties
- The palette lives in the URL, so any palette can be bookmarked or shared as a link
- Undo (up to 50 steps); a color-picker drag counts as a single step
- Save favorite palettes in `localStorage`, then load or delete them later
- Keyboard shortcuts: <kbd>Space</kbd> generate · <kbd>1</kbd>–<kbd>5</kbd> lock · <kbd>Z</kbd> undo · <kbd>S</kbd> save
- Light and dark themes, and a stacked layout on phones

## Tech

React 19 · TypeScript · Vite · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions. No color libraries: the HSL conversions, WCAG luminance math and a small seeded random number generator are in [`src/color.ts`](src/color.ts).

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # unit tests (Vitest)
```
