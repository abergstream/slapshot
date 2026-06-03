import { state, swatchColors, saveSwatchColors, DEFAULT_COLORS } from '../core/state';
import { render } from '../canvas/render';

// ── Color helpers (used within this module) ───────────────────────────────────

function applySwatchColors() {
  document.querySelectorAll<HTMLElement>('.color-swatch').forEach((btn, i) => {
    btn.style.background = swatchColors[i];
  });
}

function setColor(c: string, index?: number) {
  state.color = c;
  document.querySelectorAll<HTMLElement>('.color-swatch').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

// ── Swatch buttons ────────────────────────────────────────────────────────────

applySwatchColors();
setColor(swatchColors[0], 0);

// Single click selects color; double-click (gap ≤ 400 ms) opens the native picker.
document.querySelectorAll<HTMLElement>('.color-swatch').forEach((btn, i) => {
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';

  const input = document.createElement('input');
  input.type     = 'color';
  input.tabIndex = -1;
  input.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0;margin:0;';
  btn.appendChild(input);

  let lastClick = 0;

  input.addEventListener('click', e => {
    e.stopPropagation();
    const now = Date.now();
    const gap = now - lastClick;
    lastClick = now;
    setColor(swatchColors[i], i);
    if (gap > 400) e.preventDefault(); // single click — block picker
  });

  input.addEventListener('change', () => {
    swatchColors[i] = input.value;
    saveSwatchColors(swatchColors);
    applySwatchColors();
    setColor(input.value, i);
  });

  btn.addEventListener('contextmenu', e => {
    e.preventDefault();
    openContextMenu(e, i);
  });
});

// ── Swatch context menu ───────────────────────────────────────────────────────

let ctxSwatchIndex = -1;

const ctxMenu = document.createElement('div');
ctxMenu.id = 'swatch-ctx-menu';

// A label wrapping a hidden color input — clicking it opens the native picker.
const ctxChooseLabel = document.createElement('label');
ctxChooseLabel.className  = 'ctx-item';
ctxChooseLabel.textContent = 'Choose color';

const ctxChooseInput = document.createElement('input');
ctxChooseInput.type = 'color';
ctxChooseInput.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0;margin:0;';
ctxChooseLabel.appendChild(ctxChooseInput);

const ctxResetBtn = document.createElement('button');
ctxResetBtn.className  = 'ctx-item';
ctxResetBtn.textContent = 'Reset color';

ctxMenu.append(ctxChooseLabel, ctxResetBtn);
document.body.appendChild(ctxMenu);

function openContextMenu(e: MouseEvent, index: number) {
  ctxSwatchIndex       = index;
  ctxChooseInput.value = swatchColors[index];
  ctxMenu.style.visibility = 'hidden';
  ctxMenu.style.display    = 'block';
  const w = ctxMenu.offsetWidth, h = ctxMenu.offsetHeight;
  ctxMenu.style.left       = `${Math.min(e.clientX, window.innerWidth  - w - 8)}px`;
  ctxMenu.style.top        = `${Math.min(e.clientY, window.innerHeight - h - 8)}px`;
  ctxMenu.style.visibility = '';
}

function closeContextMenu() {
  ctxMenu.style.display = 'none';
  ctxSwatchIndex = -1;
}

document.addEventListener('mousedown', e => {
  if (ctxMenu.style.display !== 'none' && !ctxMenu.contains(e.target as Node)) {
    closeContextMenu();
  }
});

// Hide the menu on click so it disappears after the native picker is triggered.
ctxChooseLabel.addEventListener('click', () => {
  ctxMenu.style.display = 'none';
});

ctxChooseInput.addEventListener('change', () => {
  if (ctxSwatchIndex === -1) return;
  const c = ctxChooseInput.value;
  swatchColors[ctxSwatchIndex] = c;
  saveSwatchColors(swatchColors);
  applySwatchColors();
  setColor(c, ctxSwatchIndex);
  ctxSwatchIndex = -1;
});

ctxResetBtn.addEventListener('click', () => {
  if (ctxSwatchIndex === -1) return;
  const c = DEFAULT_COLORS[ctxSwatchIndex];
  swatchColors[ctxSwatchIndex] = c;
  saveSwatchColors(swatchColors);
  applySwatchColors();
  setColor(c, ctxSwatchIndex);
  closeContextMenu();
});

export {};  // ensure this file is treated as a module
