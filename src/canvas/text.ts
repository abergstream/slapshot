import { canvas, state } from '../core/state';
import { render } from './render';
import { saveUndo } from '../core/history';

let pendingTextInput: HTMLInputElement | null = null;

function commitOrDismissText() {
  if (!pendingTextInput) return;
  const input = pendingTextInput;
  pendingTextInput = null;
  const text = input.value.trim();
  const x    = parseFloat(input.dataset.cx!);
  const y    = parseFloat(input.dataset.cy!);
  input.remove();
  if (text) {
    saveUndo();
    state.shapes.push({ type: 'text', x, y, text, color: state.color, size: Math.max(16, state.strokeWidth * 6) });
    render();
  }
}

export function startTextInput(canvasX: number, canvasY: number) {
  if (pendingTextInput) commitOrDismissText();

  const fontSize = Math.max(16, state.strokeWidth * 6);
  const rect     = canvas.getBoundingClientRect();
  const scaleX   = rect.width  / canvas.width;
  const scaleY   = rect.height / canvas.height;

  const input = document.createElement('input');
  input.id             = 'text-overlay';
  input.type           = 'text';
  input.dataset.cx     = String(canvasX);
  input.dataset.cy     = String(canvasY);
  input.style.left     = `${rect.left + canvasX * scaleX}px`;
  input.style.top      = `${rect.top  + canvasY * scaleY - fontSize}px`;
  input.style.fontSize = `${fontSize * scaleY}px`;
  input.style.color    = state.color;
  input.style.borderBottomColor = state.color;

  document.body.appendChild(input);
  input.focus();
  pendingTextInput = input;

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commitOrDismissText(); }
    if (e.key === 'Escape') { input.remove(); pendingTextInput = null; }
  });
  input.addEventListener('blur', commitOrDismissText);
}
