import { canvas, ctx, state } from '../core/state';
import type { Shape } from '../core/types';

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
  }
  ctx.restore();
}
