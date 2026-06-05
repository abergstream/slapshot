import { canvas, ctx, state } from '../core/state';
import type { Shape } from '../core/types';
import { getShapeBoundingBox } from './eraser';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.bgImage) ctx.drawImage(state.bgImage, 0, 0);

  for (const layer of state.imageLayers) {
    ctx.drawImage(layer.bitmap, layer.x, layer.y);
    if (layer === state.selectedLayer) {
      ctx.save();
      ctx.strokeStyle = '#007AFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(layer.x - 1, layer.y - 1, layer.bitmap.width + 2, layer.bitmap.height + 2);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  state.shapes.forEach(drawShape);
  if (state.activeShape) drawShape(state.activeShape);

  if (state.currentTool === 'eraser' && state.eraserHoverIndex >= 0) {
    const hovered = state.shapes[state.eraserHoverIndex];
    if (hovered) {
      const bb = getShapeBoundingBox(hovered);
      if (bb) {
        const pad = 4;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 60, 40, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(bb.x - pad, bb.y - pad, bb.w + pad * 2, bb.h + pad * 2);
        ctx.fillStyle = 'rgba(255, 60, 40, 0.08)';
        ctx.fillRect(bb.x - pad, bb.y - pad, bb.w + pad * 2, bb.h + pad * 2);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }
}

function drawArrow(x1: number, y1: number, x2: number, y2: number, c: string, w: number) {
  const angle     = Math.atan2(y2 - y1, x2 - x1);
  const headLen   = Math.max(18, w * 4);
  const headAngle = Math.PI / 6;

  ctx.strokeStyle = c;
  ctx.fillStyle   = c;
  ctx.lineWidth   = w;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // Shorten the line so it doesn't poke through the arrowhead
  const ex = x2 - (headLen * 0.55) * Math.cos(angle);
  const ey = y2 - (headLen * 0.55) * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - headAngle), y2 - headLen * Math.sin(angle - headAngle));
  ctx.lineTo(x2 - headLen * 0.5  * Math.cos(angle),     y2 - headLen * 0.5  * Math.sin(angle));
  ctx.lineTo(x2 - headLen * Math.cos(angle + headAngle), y2 - headLen * Math.sin(angle + headAngle));
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (!para) { lines.push(''); continue; }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawShape(s: Shape) {
  ctx.save();
  switch (s.type) {
    case 'arrow':
      drawArrow(s.x1, s.y1, s.x2, s.y2, s.color, s.width);
      break;

    case 'rect':
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.width;
      ctx.lineJoin    = 'round';
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      break;

    case 'circle':
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.width;
      ctx.beginPath();
      ctx.ellipse(s.cx, s.cy, Math.max(1, Math.abs(s.rx)), Math.max(1, Math.abs(s.ry)), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'pen':
      if (s.points.length < 2) break;
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo(s.points[0][0], s.points[0][1]);
      for (let i = 1; i < s.points.length; i++) {
        const mx = (s.points[i][0] + s.points[i - 1][0]) / 2;
        const my = (s.points[i][1] + s.points[i - 1][1]) / 2;
        ctx.quadraticCurveTo(s.points[i - 1][0], s.points[i - 1][1], mx, my);
      }
      ctx.lineTo(s.points[s.points.length - 1][0], s.points[s.points.length - 1][1]);
      ctx.stroke();
      break;

    case 'highlight':
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = s.color;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.globalAlpha = 1;
      break;

    case 'text':
      ctx.font      = `bold ${s.size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x, s.y);
      break;

    case 'textbox': {
      const x0 = s.w < 0 ? s.x + s.w : s.x;
      const y0 = s.h < 0 ? s.y + s.h : s.y;
      const w0 = Math.abs(s.w);
      const h0 = Math.abs(s.h);

      // Drag preview — no text yet
      if (!s.text) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth   = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x0, y0, w0, h0);
        ctx.setLineDash([]);
        break;
      }

      if (s.bgColor !== 'transparent') {
        ctx.fillStyle = hexToRgba(s.bgColor, s.bgOpacity ?? 1);
        ctx.fillRect(x0, y0, w0, h0);
      }

      const fontParts: string[] = [];
      if (s.italic) fontParts.push('italic');
      if (s.bold)   fontParts.push('bold');
      fontParts.push(`${s.fontSize}px`, s.fontFamily);
      ctx.font         = fontParts.join(' ');
      ctx.fillStyle    = s.color;
      ctx.textBaseline = 'top';

      const pad        = 4;
      const lineHeight = s.fontSize * 1.4;
      const lines      = wrapText(ctx, s.text, w0 - pad * 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, w0, h0);
      ctx.clip();
      lines.forEach((line, i) => {
        const lx = x0 + pad;
        const ly = y0 + pad + i * lineHeight;
        ctx.fillText(line, lx, ly);
        if (s.underline) {
          const mw = ctx.measureText(line).width;
          ctx.fillRect(lx, ly + s.fontSize + 1, mw, Math.max(1, Math.round(s.fontSize / 16)));
        }
      });
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}
