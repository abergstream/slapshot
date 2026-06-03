import { canvas, state } from '../core/state';
import { render } from './render';
import { saveUndo } from '../core/history';
import { startTextInput } from './text';

function getCanvasPos(e: MouseEvent): [number, number] {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
}

// ── Canvas mouse events ───────────────────────────────────────────────────────

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0 || !state.bgImage) return;
  const [x, y] = getCanvasPos(e);

  for (let i = state.imageLayers.length - 1; i >= 0; i--) {
    const layer = state.imageLayers[i];
    if (x >= layer.x && x <= layer.x + layer.bitmap.width &&
        y >= layer.y && y <= layer.y + layer.bitmap.height) {
      state.selectedLayer = layer;
      state.draggingLayer = { layer, offX: x - layer.x, offY: y - layer.y };
      render();
      return;
    }
  }
  state.selectedLayer = null;

  if (state.currentTool === 'text') {
    startTextInput(x, y);
    return;
  }

  state.isDrawing = true;
  state.startX    = x;
  state.startY    = y;

  if (state.currentTool === 'pen') {
    state.activeShape = { type: 'pen', points: [[x, y]], color: state.color, width: state.strokeWidth };
  }
});

canvas.addEventListener('mousemove', e => {
  if (state.draggingLayer) return;
  const [x, y] = getCanvasPos(e);

  if (!state.isDrawing) {
    const overLayer = state.imageLayers.some(l =>
      x >= l.x && x <= l.x + l.bitmap.width &&
      y >= l.y && y <= l.y + l.bitmap.height
    );
    canvas.style.cursor = overLayer ? 'move' : (state.currentTool === 'text' ? 'text' : 'crosshair');
    return;
  }

  const { startX, startY, color, strokeWidth } = state;
  const shift = e.shiftKey;

  switch (state.currentTool) {
    case 'arrow':
      state.activeShape = { type: 'arrow', x1: startX, y1: startY, x2: x, y2: y, color, width: strokeWidth };
      break;

    case 'rect': {
      let w = x - startX, h = y - startY;
      if (shift) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w) * s; h = Math.sign(h) * s; }
      state.activeShape = { type: 'rect', x: startX, y: startY, w, h, color, width: strokeWidth };
      break;
    }

    case 'circle': {
      let rx = (x - startX) / 2, ry = (y - startY) / 2;
      if (shift) { const r = Math.max(Math.abs(rx), Math.abs(ry)); rx = Math.sign(rx) * r; ry = Math.sign(ry) * r; }
      state.activeShape = { type: 'circle', cx: startX + rx, cy: startY + ry, rx, ry, color, width: strokeWidth };
      break;
    }

    case 'pen':
      if (state.activeShape?.type === 'pen') state.activeShape.points.push([x, y]);
      break;

    case 'highlight': {
      let w = x - startX, h = y - startY;
      if (shift) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w) * s; h = Math.sign(h) * s; }
      state.activeShape = { type: 'highlight', x: startX, y: startY, w, h, color };
      break;
    }
  }

  render();
});

function finishDrawing() {
  if (!state.isDrawing) return;
  state.isDrawing = false;

  const s = state.activeShape;
  if (s) {
    let valid = true;
    if (s.type === 'arrow')     valid = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 8;
    else if (s.type === 'pen')  valid = s.points.length > 3;
    else if (s.type === 'rect' || s.type === 'highlight') valid = Math.abs(s.w) > 5 && Math.abs(s.h) > 5;
    else if (s.type === 'circle') valid = Math.abs(s.rx) > 4 || Math.abs(s.ry) > 4;

    if (valid) { saveUndo(); state.shapes.push(s); }
    state.activeShape = null;
    render();
  }
}

canvas.addEventListener('mouseup',    finishDrawing);
canvas.addEventListener('mouseleave', finishDrawing);

// ── Document-level drag (so dragging continues outside canvas bounds) ─────────

document.addEventListener('mousemove', e => {
  if (!state.draggingLayer) return;
  const [x, y] = getCanvasPos(e);
  state.draggingLayer.layer.x = x - state.draggingLayer.offX;
  state.draggingLayer.layer.y = y - state.draggingLayer.offY;
  render();
});

document.addEventListener('mouseup', () => {
  if (!state.draggingLayer) return;
  state.draggingLayer = null;
  render();
});
