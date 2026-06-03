import { canvas, state } from '../core/state';
import { render } from '../canvas/render';
import { undo, saveUndo } from '../core/history';
import type { Tool } from '../core/types';

export function setTool(tool: Tool) {
  state.currentTool = tool;
  document.querySelectorAll<HTMLElement>('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
}

document.querySelectorAll<HTMLElement>('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool as Tool));
});

document.querySelectorAll<HTMLElement>('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.strokeWidth = parseInt(btn.dataset.size!);
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
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
