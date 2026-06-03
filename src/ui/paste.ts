import { canvas, emptyState, state } from '../core/state';
import { render } from '../canvas/render';

export function newSession() {
  state.bgImage       = null;
  state.imageLayers   = [];
  state.selectedLayer = null;
  state.draggingLayer = null;
  state.shapes        = [];
  state.undoStack     = [];
  state.activeShape   = null;

  canvas.width  = 0;
  canvas.height = 0;
  canvas.style.display     = 'none';
  emptyState.style.display = '';
  document.getElementById('workspace')!.classList.remove('has-image');

  window.electronAPI?.resetWindow();
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of Array.from(items)) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;

    const bitmap = await createImageBitmap(file);

    if (!state.bgImage) {
      state.bgImage       = bitmap;
      state.shapes        = [];
      state.undoStack     = [];
      state.activeShape   = null;
      state.imageLayers   = [];
      state.selectedLayer = null;

      canvas.width  = bitmap.width;
      canvas.height = bitmap.height;
      canvas.style.display     = 'block';
      emptyState.style.display = 'none';
      document.getElementById('workspace')!.classList.add('has-image');

      const toolbarH = (document.getElementById('toolbar') as HTMLElement).offsetHeight;
      const totalH   = bitmap.height + toolbarH;

      // If height gets clamped, a vertical scrollbar will appear and eat into
      // the width, cascading into a horizontal scrollbar. Pre-compensate by
      // measuring Chromium's actual scrollbar width.
      let targetW = bitmap.width;
      if (totalH > window.screen.availHeight) {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden;';
        document.body.appendChild(probe);
        targetW += probe.offsetWidth - probe.clientWidth;
        document.body.removeChild(probe);
      }

      window.electronAPI?.resizeToImage(targetW, totalH);
    } else {
      const layer = {
        bitmap,
        x: Math.round((canvas.width  - bitmap.width)  / 2),
        y: Math.round((canvas.height - bitmap.height) / 2),
      };
      state.imageLayers.push(layer);
      state.selectedLayer = layer;
    }

    render();
    canvas.focus();
    break;
  }
}

document.addEventListener('paste', handlePaste);
document.getElementById('newBtn')!.addEventListener('click', newSession);
