import { canvas, state } from '../core/state';
import { render } from './render';
import { saveUndo } from '../core/history';
import type { TextBoxShape } from '../core/types';

const FONT_FAMILIES: Array<{ value: string; label: string }> = [
  { value: 'system-ui, -apple-system, sans-serif', label: 'System' },
  { value: 'Georgia, "Times New Roman", serif',    label: 'Serif'  },
  { value: '"Courier New", Courier, monospace',    label: 'Mono'   },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

const fmt = {
  color:      '',
  bgColor:    'transparent' as string,
  bgOpacity:  0.85,
  fontSize:   16,
  fontFamily: FONT_FAMILIES[0].value,
  bold:       false,
  italic:     false,
  underline:  false,
};

interface ActiveBox {
  container:     HTMLElement;
  textarea:      HTMLTextAreaElement;
  bar:           HTMLElement;
  sx:            number;   // screen coords, updated on resize
  sy:            number;
  sw:            number;
  sh:            number;
  scaleX:        number;
  scaleY:        number;
  originalShape: TextBoxShape | null;
}

let active: ActiveBox | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

export function startTextBox(cx: number, cy: number, cw: number, ch: number) {
  commitOrDismiss();
  fmt.color = state.color;
  openTextBox(cx, cy, cw, ch, '', null);
}

export function editTextBox(index: number) {
  commitOrDismiss();
  const shape = state.shapes[index] as TextBoxShape;

  fmt.color      = shape.color;
  fmt.bgColor    = shape.bgColor;
  fmt.bgOpacity  = shape.bgOpacity ?? 0.85;
  fmt.fontSize   = shape.fontSize;
  fmt.fontFamily = shape.fontFamily;
  fmt.bold       = shape.bold;
  fmt.italic     = shape.italic;
  fmt.underline  = shape.underline;

  saveUndo();
  state.shapes.splice(index, 1);
  render();

  openTextBox(shape.x, shape.y, shape.w, shape.h, shape.text, shape);
}

// ── Private ───────────────────────────────────────────────────────────────────

function openTextBox(
  cx: number, cy: number, cw: number, ch: number,
  initialText: string,
  originalShape: TextBoxShape | null,
) {
  const x = cw < 0 ? cx + cw : cx;
  const y = ch < 0 ? cy + ch : cy;
  const w = Math.abs(cw);
  const h = Math.abs(ch);

  const cr     = canvas.getBoundingClientRect();
  const scaleX = cr.width  / canvas.width;
  const scaleY = cr.height / canvas.height;
  const sx = cr.left + x * scaleX;
  const sy = cr.top  + y * scaleY;
  const sw = w * scaleX;
  const sh = h * scaleY;

  const { container, textarea } = buildContainer(sx, sy, sw, sh, scaleY);
  textarea.value = initialText;
  const bar = buildFormatBar(textarea, sx, sy, sw, sh, scaleY);

  document.body.appendChild(container);
  document.body.appendChild(bar);
  active = { container, textarea, bar, sx, sy, sw, sh, scaleX, scaleY, originalShape };
  textarea.focus();
  textarea.setSelectionRange(initialText.length, initialText.length);

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  });

  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick, { capture: true });
  }, 0);
}

function handleOutsideClick(e: MouseEvent) {
  if (!active) return;
  const t = e.target as Node;
  if (!active.container.contains(t) && !active.bar.contains(t)) commit();
}

function dismiss() {
  if (!active) return;
  active.container.remove();
  active.bar.remove();
  active = null;
  document.removeEventListener('mousedown', handleOutsideClick, { capture: true });
}

function cancelEdit() {
  if (!active) return;
  const snap = active.originalShape;
  dismiss();
  if (snap) {
    state.undoStack.pop();
    state.shapes.push(snap);
    render();
  }
}

function commit() {
  if (!active) return;
  const { textarea, sx, sy, sw, sh, scaleX, scaleY, originalShape } = active;
  const text = textarea.value;

  // Convert current screen bounds back to canvas coords (picks up any resizing)
  const cr = canvas.getBoundingClientRect();
  const x = (sx - cr.left) / scaleX;
  const y = (sy - cr.top)  / scaleY;
  const w = sw / scaleX;
  const h = sh / scaleY;

  dismiss();

  if (text.trim()) {
    if (!originalShape) saveUndo();
    state.shapes.push({
      type: 'textbox', x, y, w, h, text,
      color:      fmt.color,
      bgColor:    fmt.bgColor,
      bgOpacity:  fmt.bgOpacity,
      fontSize:   fmt.fontSize,
      fontFamily: fmt.fontFamily,
      bold:       fmt.bold,
      italic:     fmt.italic,
      underline:  fmt.underline,
    } as TextBoxShape);
    render();
  } else if (originalShape) {
    state.undoStack.pop();
    state.shapes.push(originalShape);
    render();
  }
}

function commitOrDismiss() {
  if (!active) return;
  if (active.textarea.value.trim()) commit(); else cancelEdit();
}

// ── Container (textarea + resize handles) ─────────────────────────────────────

function buildContainer(sx: number, sy: number, sw: number, sh: number, scaleY: number) {
  const container = document.createElement('div');
  container.className = 'tb-container';
  Object.assign(container.style, {
    position: 'fixed',
    left:     `${sx}px`,
    top:      `${sy}px`,
    width:    `${sw}px`,
    height:   `${sh}px`,
    zIndex:   '1000',
  });

  const textarea = document.createElement('textarea');
  Object.assign(textarea.style, {
    position:     'absolute',
    inset:        '0',
    width:        '100%',
    height:       '100%',
    boxSizing:    'border-box',
    border:       '2px dashed',
    borderRadius: '0',
    outline:      'none',
    resize:       'none',
    padding:      `${Math.round(4 * scaleY)}px ${Math.round(6 * scaleY)}px`,
    overflow:     'hidden',
    caretColor:   'currentColor',
    wordBreak:    'break-word',
  });
  syncTextarea(textarea, scaleY);
  container.appendChild(textarea);

  for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
    const handle = document.createElement('div');
    handle.className = `tb-handle tb-handle-${corner}`;
    container.appendChild(handle);
    attachResize(handle, corner);
  }

  return { container, textarea };
}

function attachResize(handle: HTMLElement, corner: 'nw' | 'ne' | 'sw' | 'se') {
  handle.addEventListener('mousedown', e => {
    if (!active) return;
    e.preventDefault(); // keep textarea focused

    const startX  = e.clientX;
    const startY  = e.clientY;
    const startSx = active.sx;
    const startSy = active.sy;
    const startSw = active.sw;
    const startSh = active.sh;
    const MIN_W = 60;
    const MIN_H = 40;

    const onMove = (ev: MouseEvent) => {
      if (!active) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let sx = startSx, sy = startSy, sw = startSw, sh = startSh;

      if (corner === 'se') {
        sw = Math.max(MIN_W, startSw + dx);
        sh = Math.max(MIN_H, startSh + dy);
      } else if (corner === 'sw') {
        const nw = Math.max(MIN_W, startSw - dx);
        sx = startSx + (startSw - nw);
        sw = nw;
        sh = Math.max(MIN_H, startSh + dy);
      } else if (corner === 'ne') {
        const nh = Math.max(MIN_H, startSh - dy);
        sy = startSy + (startSh - nh);
        sw = Math.max(MIN_W, startSw + dx);
        sh = nh;
      } else {
        const nw = Math.max(MIN_W, startSw - dx);
        sx = startSx + (startSw - nw);
        sw = nw;
        const nh = Math.max(MIN_H, startSh - dy);
        sy = startSy + (startSh - nh);
        sh = nh;
      }

      active.sx = sx; active.sy = sy; active.sw = sw; active.sh = sh;
      Object.assign(active.container.style, {
        left: `${sx}px`, top: `${sy}px`, width: `${sw}px`, height: `${sh}px`,
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Textarea styling ──────────────────────────────────────────────────────────

function bgStyle(): string {
  if (fmt.bgColor === 'transparent') return 'transparent';
  return hexToRgba(fmt.bgColor, fmt.bgOpacity);
}

function syncTextarea(ta: HTMLTextAreaElement, scaleY: number) {
  ta.style.color          = fmt.color;
  ta.style.background     = bgStyle();
  ta.style.borderColor    = fmt.color;
  ta.style.fontSize       = `${fmt.fontSize * scaleY}px`;
  ta.style.lineHeight     = `${fmt.fontSize * 1.4 * scaleY}px`;
  ta.style.fontFamily     = fmt.fontFamily;
  ta.style.fontWeight     = fmt.bold      ? 'bold'      : 'normal';
  ta.style.fontStyle      = fmt.italic    ? 'italic'    : 'normal';
  ta.style.textDecoration = fmt.underline ? 'underline' : 'none';
}

// ── Format bar ────────────────────────────────────────────────────────────────

function buildFormatBar(
  ta: HTMLTextAreaElement,
  sx: number, sy: number, sw: number, sh: number, scaleY: number,
): HTMLElement {
  const bar = document.createElement('div');
  bar.id = 'text-format-bar';

  // Text color
  const colorPicker = hiddenPicker(toHex(fmt.color) ?? '#ff3b30');
  const colorBtn = document.createElement('button');
  colorBtn.className = 'tf-color-btn';
  colorBtn.title = 'Text color';
  colorBtn.style.background = fmt.color;
  colorBtn.append(colorPicker);
  colorBtn.addEventListener('click', () => colorPicker.click());
  colorPicker.addEventListener('input', () => {
    fmt.color = colorPicker.value;
    colorBtn.style.background = fmt.color;
    syncTextarea(ta, scaleY);
  });

  // Background color + opacity
  const bgPicker = hiddenPicker(fmt.bgColor === 'transparent' ? '#000000' : (toHex(fmt.bgColor) ?? '#000000'));
  const bgBtn = document.createElement('button');
  bgBtn.className = 'tf-color-btn';
  bgBtn.title = 'Background (click to set · click again to remove)';
  bgBtn.append(bgPicker);

  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range'; opacitySlider.className = 'tf-opacity-slider';
  opacitySlider.min = '0'; opacitySlider.max = '100'; opacitySlider.step = '1';
  opacitySlider.value = String(Math.round(fmt.bgOpacity * 100));
  opacitySlider.title = 'Background opacity';

  const refreshBg = () => {
    if (fmt.bgColor === 'transparent') {
      bgBtn.style.background = ''; bgBtn.classList.add('tf-no-bg');
      opacitySlider.style.display = 'none';
    } else {
      bgBtn.style.background = fmt.bgColor; bgBtn.classList.remove('tf-no-bg');
      bgPicker.value = toHex(fmt.bgColor) ?? '#000000';
      opacitySlider.style.display = '';
      opacitySlider.value = String(Math.round(fmt.bgOpacity * 100));
    }
  };
  refreshBg();

  bgBtn.addEventListener('click', () => {
    if (fmt.bgColor === 'transparent') bgPicker.click();
    else { fmt.bgColor = 'transparent'; refreshBg(); syncTextarea(ta, scaleY); }
  });
  bgPicker.addEventListener('input', () => { fmt.bgColor = bgPicker.value; refreshBg(); syncTextarea(ta, scaleY); });
  opacitySlider.addEventListener('input', () => { fmt.bgOpacity = parseInt(opacitySlider.value) / 100; syncTextarea(ta, scaleY); });

  // Font family
  const ffSel = document.createElement('select');
  ffSel.className = 'tf-select';
  FONT_FAMILIES.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = label;
    if (value === fmt.fontFamily) opt.selected = true;
    ffSel.append(opt);
  });
  ffSel.addEventListener('change', () => { fmt.fontFamily = ffSel.value; syncTextarea(ta, scaleY); });

  // Font size
  const fsSel = document.createElement('select');
  fsSel.className = 'tf-select tf-size-sel';
  FONT_SIZES.forEach(size => {
    const opt = document.createElement('option');
    opt.value = String(size); opt.textContent = String(size);
    if (size === fmt.fontSize) opt.selected = true;
    fsSel.append(opt);
  });
  fsSel.addEventListener('change', () => { fmt.fontSize = parseInt(fsSel.value); syncTextarea(ta, scaleY); });

  // Bold / Italic / Underline
  const fmtToggle = (html: string, title: string, get: () => boolean, set: (v: boolean) => void) => {
    const btn = document.createElement('button');
    btn.className = `tf-fmt-btn${get() ? ' active' : ''}`;
    btn.title = title; btn.innerHTML = html;
    btn.addEventListener('click', () => { set(!get()); btn.classList.toggle('active', get()); syncTextarea(ta, scaleY); });
    return btn;
  };

  const sep = () => { const d = document.createElement('div'); d.className = 'tf-sep'; return d; };
  const lbl = (t: string) => { const s = document.createElement('span'); s.className = 'tf-label'; s.textContent = t; return s; };

  bar.append(
    lbl('T'), colorBtn, sep(),
    lbl('BG'), bgBtn, opacitySlider, sep(),
    ffSel, fsSel, sep(),
    fmtToggle('<b>B</b>', 'Bold',      () => fmt.bold,      v => { fmt.bold = v; }),
    fmtToggle('<i>I</i>', 'Italic',    () => fmt.italic,    v => { fmt.italic = v; }),
    fmtToggle('<u>U</u>', 'Underline', () => fmt.underline, v => { fmt.underline = v; }),
  );

  const barEstH = 46;
  const gap     = 8;
  const top     = sy - barEstH - gap >= 8 ? sy - barEstH - gap : sy + sh + gap;
  Object.assign(bar.style, { position: 'fixed', zIndex: '1001', top: `${top}px`, left: `${sx}px` });
  requestAnimationFrame(() => {
    const bw = bar.offsetWidth;
    bar.style.left = `${Math.max(8, Math.min(sx + (sw - bw) / 2, window.innerWidth - bw - 8))}px`;
  });

  return bar;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function hiddenPicker(value: string): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type = 'color'; inp.value = value; inp.className = 'tf-hidden-picker';
  return inp;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function toHex(color: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) return '#' + [...color.slice(1)].map(c => c + c).join('');
  const m = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
}
