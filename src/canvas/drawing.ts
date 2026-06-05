import { canvas, state } from '../core/state';
import { render } from './render';
import { saveUndo } from '../core/history';
import { startTextBox, editTextBox } from './text';
import { findTopmostShape } from './eraser';

let eraserUndoSaved = false;

function getCanvasPos(e: MouseEvent): [number, number] {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY];
}

function snapTo45(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return [x1 + dist * Math.cos(snapped), y1 + dist * Math.sin(snapped)];
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

  if (state.currentTool === 'eraser') {
    eraserUndoSaved = false;
    const idx = findTopmostShape(state.shapes, x, y);
    if (idx >= 0) {
      saveUndo();
      eraserUndoSaved = true;
      state.shapes.splice(idx, 1);
      state.eraserHoverIndex = findTopmostShape(state.shapes, x, y);
      render();
    }
    state.isDrawing = true;
    return;
  }

  if (state.currentTool === 'text') {
    for (let i = state.shapes.length - 1; i >= 0; i--) {
      const s = state.shapes[i];
      if (s.type !== 'textbox') continue;
      const x0 = s.w < 0 ? s.x + s.w : s.x;
      const y0 = s.h < 0 ? s.y + s.h : s.y;
      if (x >= x0 && x <= x0 + Math.abs(s.w) && y >= y0 && y <= y0 + Math.abs(s.h)) {
        editTextBox(i);
        return;
      }
    }
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

  if (state.currentTool === 'eraser') {
    const idx = findTopmostShape(state.shapes, x, y);
    state.eraserHoverIndex = idx;
    canvas.style.cursor = idx >= 0 ? 'pointer' : 'crosshair';
    if (state.isDrawing && idx >= 0) {
      if (!eraserUndoSaved) { saveUndo(); eraserUndoSaved = true; }
      state.shapes.splice(idx, 1);
      state.eraserHoverIndex = findTopmostShape(state.shapes, x, y);
    }
    render();
    return;
  }

  if (!state.isDrawing) {
    const overLayer = state.imageLayers.some(l =>
      x >= l.x && x <= l.x + l.bitmap.width &&
      y >= l.y && y <= l.y + l.bitmap.height
    );
    if (overLayer) {
      canvas.style.cursor = 'move';
    } else if (state.currentTool === 'text') {
      const overTextbox = state.shapes.some(s => {
        if (s.type !== 'textbox') return false;
        const x0 = s.w < 0 ? s.x + s.w : s.x;
        const y0 = s.h < 0 ? s.y + s.h : s.y;
        return x >= x0 && x <= x0 + Math.abs(s.w) && y >= y0 && y <= y0 + Math.abs(s.h);
      });
      canvas.style.cursor = overTextbox ? 'text' : 'crosshair';
    } else {
      canvas.style.cursor = 'crosshair';
    }
    return;
  }

  const { startX, startY, color, strokeWidth } = state;
  const shift = e.shiftKey;

  switch (state.currentTool) {
    case 'arrow': {
      const [x2, y2] = shift ? snapTo45(startX, startY, x, y) : [x, y];
      state.activeShape = { type: 'arrow', x1: startX, y1: startY, x2, y2, color, width: strokeWidth };
      break;
    }

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
      if (state.activeShape?.type === 'pen') {
        if (shift) {
          const [sx, sy] = snapTo45(startX, startY, x, y);
          state.activeShape.points = [[startX, startY], [sx, sy]];
        } else {
          state.activeShape.points.push([x, y]);
        }
      }
      break;

    case 'highlight': {
      let w = x - startX, h = y - startY;
      if (shift) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w) * s; h = Math.sign(h) * s; }
      state.activeShape = { type: 'highlight', x: startX, y: startY, w, h, color };
      break;
    }

    case 'text': {
      const w = x - startX, h = y - startY;
      state.activeShape = {
        type: 'textbox', x: startX, y: startY, w, h,
        text: '', color, bgColor: 'transparent', bgOpacity: 0.85,
        fontSize: 16, fontFamily: 'system-ui', bold: false, italic: false, underline: false,
      };
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
    if (s.type === 'textbox') {
      const { x, y, w, h } = s;
      state.activeShape = null;
      render();
      if (Math.abs(w) > 20 && Math.abs(h) > 20) startTextBox(x, y, w, h);
      return;
    }

    let valid = true;
    if (s.type === 'arrow')     valid = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 8;
    else if (s.type === 'pen')  valid = s.points.length === 2
      ? Math.hypot(s.points[1][0] - s.points[0][0], s.points[1][1] - s.points[0][1]) > 8
      : s.points.length > 3;
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
