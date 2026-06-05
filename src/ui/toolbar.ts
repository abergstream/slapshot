import { canvas, state, saveStrokeWidth } from '../core/state';
import { render } from '../canvas/render';
import { undo, saveUndo } from '../core/history';
import type { Tool } from '../core/types';

export function setTool(tool: Tool) {
  state.currentTool = tool;
  state.eraserHoverIndex = -1;
  document.querySelectorAll<HTMLElement>('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  canvas.style.cursor = 'crosshair';
  render();
}

document.querySelectorAll<HTMLElement>('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool as Tool));
});

const sizeBtns = document.querySelectorAll<HTMLElement>('.size-btn');

sizeBtns.forEach(btn => {
  if (parseInt(btn.dataset.size!) === state.strokeWidth) btn.classList.add('active');
  else btn.classList.remove('active');

  btn.addEventListener('click', () => {
    state.strokeWidth = parseInt(btn.dataset.size!);
    saveStrokeWidth(state.strokeWidth);
    sizeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('captureBtn')!.addEventListener('click', () => {
  window.electronAPI?.startScrollCapture();
});

document.getElementById('undoBtn')!.addEventListener('click', undo);

document.getElementById('clearBtn')!.addEventListener('click', () => {
  if (state.shapes.length === 0 && state.imageLayers.length === 0) return;
  saveUndo();
  state.shapes        = [];
  state.imageLayers   = [];
  state.selectedLayer = null;
  render();
});
