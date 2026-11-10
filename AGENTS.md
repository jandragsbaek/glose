# AGENTS.md

## Product

[docs/ideas.md](docs/ideas.md) holds what Glose is and every decision so far. Read it before
product work, and record new decisions there.

## Design

The UI is an unstyled placeholder. Jan designs it from the ground up: build features as plain
semantic HTML, and bring every visual choice (layout, color, type, window chrome, icons) to him.

## Code origin

Write Glose code new. [T3 Code](https://github.com/pingdotgg/t3code) (MIT) is the model for
mechanisms and may be adapted with its license. learnharness (AGPL-3.0) is a source of ideas only.

## Verifying the desktop app

`pnpm dev` serves the same app in a browser, which is enough for most work. Electron needs a
display and GTK; on a headless Linux node, check Electron-specific changes on a macOS node.
