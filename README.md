# Slapshot

> **Note:** I haven't written a single line of code in this project. Every file — architecture, features, bug fixes, and refactors — was written entirely by [Claude](https://claude.ai) (Anthropic's AI) through an ongoing conversation.

---

Slapshot is a minimal, fast screenshot annotation tool built with Electron. Paste a screenshot, draw on it, copy or save — that's it.

## Features

- **Paste to start** — paste any image from your clipboard and the window resizes to fit it automatically
- **Annotation tools** — arrow, rectangle, ellipse, freehand pen, highlight, and text
- **Color swatches** — 8 customizable colors; single-click to select, double-click to change, right-click for a context menu
- **Stroke sizes** — four thickness levels
- **Image layers** — paste additional images on top of the background; drag them freely to reposition
- **Undo** — step back through annotation history (Ctrl+Z)
- **Clear** — remove all annotations and layers at once
- **Export** — copy the result to clipboard (Ctrl+Shift+C) or save as PNG (Ctrl+S)
- **New session** — reset everything and start fresh (Ctrl+N)

## Keyboard shortcuts

| Shortcut       | Action            |
| -------------- | ----------------- |
| `Ctrl+V`       | Paste image       |
| `Ctrl+Z`       | Undo              |
| `Ctrl+S`       | Save as PNG       |
| `Ctrl+Shift+C` | Copy to clipboard |
| `Ctrl+N`       | New session       |
| `A`            | Arrow tool        |
| `R`            | Rectangle tool    |
| `E`            | Ellipse tool      |
| `P`            | Pen tool          |
| `H`            | Highlight tool    |
| `T`            | Text tool         |

## Tech stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [Vite](https://vitejs.dev/) + [electron-forge](https://www.electronforge.io/) — build tooling
- TypeScript — type safety
- HTML5 Canvas — all rendering

## Getting started

```bash
npm install
npm start


src/
  renderer.ts       # entry point + keyboard shortcuts
  main.ts           # Electron main process
  preload.ts        # context bridge (IPC)
  core/
    types.ts        # TypeScript interfaces
    state.ts        # shared mutable state + DOM refs
    history.ts      # undo/redo
  canvas/
    render.ts       # canvas rendering
    drawing.ts      # mouse draw handlers + layer drag
    text.ts         # text overlay input
  ui/
    toolbar.ts      # toolbar buttons
    colors.ts       # color swatches + context menu
    paste.ts        # paste handler + new session
    export.ts       # copy / save
```
