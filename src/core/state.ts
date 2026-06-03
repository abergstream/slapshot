import type { Tool, Shape, ImageLayer } from './types';

// ── Swatch colors ─────────────────────────────────────────────────────────────

export const DEFAULT_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE', '#FFFFFF', '#000000'];

export function saveSwatchColors(colors: string[]) {
  localStorage.setItem('swatchColors', JSON.stringify(colors));
}

function loadSwatchColors(): string[] {
  try {
    const saved = localStorage.getItem('swatchColors');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [...DEFAULT_COLORS];
}

export const swatchColors = loadSwatchColors();

// ── DOM refs ──────────────────────────────────────────────────────────────────

export const canvas     = document.getElementById('canvas')      as HTMLCanvasElement;
export const ctx        = canvas.getContext('2d')!;
export const emptyState = document.getElementById('empty-state') as HTMLElement;

// ── Mutable drawing state ─────────────────────────────────────────────────────

export const state = {
  bgImage:       null as ImageBitmap | null,
  imageLayers:   [] as ImageLayer[],
  selectedLayer: null as ImageLayer | null,
  draggingLayer: null as { layer: ImageLayer; offX: number; offY: number } | null,
  shapes:        [] as Shape[],
  undoStack:     [] as Shape[][],
  currentTool:   'arrow' as Tool,
  isDrawing:     false,
  startX:        0,
  startY:        0,
  activeShape:   null as Shape | null,
  color:         '',
  strokeWidth:   4,
};

state.color = swatchColors[0];
