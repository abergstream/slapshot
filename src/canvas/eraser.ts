import type { Shape } from '../core/types';

const HIT_THRESHOLD = 8;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTestShape(s: Shape, x: number, y: number): boolean {
  const thr = HIT_THRESHOLD;
  switch (s.type) {
    case 'arrow':
      return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) <= s.width / 2 + thr;

    case 'rect': {
      const x0 = Math.min(s.x, s.x + s.w), x1 = Math.max(s.x, s.x + s.w);
      const y0 = Math.min(s.y, s.y + s.h), y1 = Math.max(s.y, s.y + s.h);
      const t = s.width / 2 + thr;
      return (Math.abs(x - x0) <= t && y >= y0 - t && y <= y1 + t) ||
             (Math.abs(x - x1) <= t && y >= y0 - t && y <= y1 + t) ||
             (Math.abs(y - y0) <= t && x >= x0 - t && x <= x1 + t) ||
             (Math.abs(y - y1) <= t && x >= x0 - t && x <= x1 + t);
    }

    case 'circle': {
      const rx = Math.abs(s.rx), ry = Math.abs(s.ry);
      if (rx < 1 || ry < 1) return false;
      const nx = (x - s.cx) / rx, ny = (y - s.cy) / ry;
      const normDist = Math.sqrt(nx * nx + ny * ny);
      const normThreshold = (s.width / 2 + thr) / Math.min(rx, ry);
      return Math.abs(normDist - 1) <= normThreshold;
    }

    case 'pen': {
      const t = s.width / 2 + thr;
      for (let i = 1; i < s.points.length; i++) {
        if (distToSegment(x, y, s.points[i-1][0], s.points[i-1][1], s.points[i][0], s.points[i][1]) <= t) return true;
      }
      return false;
    }

    case 'highlight': {
      const x0 = Math.min(s.x, s.x + s.w), x1 = Math.max(s.x, s.x + s.w);
      const y0 = Math.min(s.y, s.y + s.h), y1 = Math.max(s.y, s.y + s.h);
      return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    }

    case 'text':
      return x >= s.x - thr && x <= s.x + 200 && y >= s.y - s.size && y <= s.y + thr;

    case 'textbox': {
      const x0 = s.w < 0 ? s.x + s.w : s.x;
      const y0 = s.h < 0 ? s.y + s.h : s.y;
      return x >= x0 && x <= x0 + Math.abs(s.w) && y >= y0 && y <= y0 + Math.abs(s.h);
    }
  }
}

export function findTopmostShape(shapes: Shape[], x: number, y: number): number {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (hitTestShape(shapes[i], x, y)) return i;
  }
  return -1;
}

export function getShapeBoundingBox(s: Shape): { x: number; y: number; w: number; h: number } | null {
  switch (s.type) {
    case 'arrow':
      return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
    case 'rect':
      return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
    case 'circle':
      return { x: s.cx - Math.abs(s.rx), y: s.cy - Math.abs(s.ry), w: Math.abs(s.rx) * 2, h: Math.abs(s.ry) * 2 };
    case 'pen': {
      if (!s.points.length) return null;
      const xs = s.points.map(p => p[0]), ys = s.points.map(p => p[1]);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    case 'highlight':
      return { x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
    case 'text':
      return { x: s.x, y: s.y - s.size, w: 200, h: s.size * 1.5 };
    case 'textbox':
      return { x: s.w < 0 ? s.x + s.w : s.x, y: s.h < 0 ? s.y + s.h : s.y, w: Math.abs(s.w), h: Math.abs(s.h) };
  }
}
