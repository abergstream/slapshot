export type Tool = 'arrow' | 'rect' | 'circle' | 'pen' | 'highlight' | 'text';

export interface ArrowShape     { type: 'arrow';     x1: number; y1: number; x2: number; y2: number; color: string; width: number; }
export interface RectShape      { type: 'rect';      x: number;  y: number;  w: number;  h: number;  color: string; width: number; }
export interface CircleShape    { type: 'circle';    cx: number; cy: number; rx: number; ry: number; color: string; width: number; }
export interface PenShape       { type: 'pen';       points: [number, number][]; color: string; width: number; }
export interface HighlightShape { type: 'highlight'; x: number;  y: number;  w: number;  h: number;  color: string; }
export interface TextShape      { type: 'text';      x: number;  y: number;  text: string; color: string; size: number; }
export type Shape = ArrowShape | RectShape | CircleShape | PenShape | HighlightShape | TextShape;

export interface ImageLayer { bitmap: ImageBitmap; x: number; y: number; }
