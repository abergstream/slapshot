import { state } from './state';
import { render } from '../canvas/render';

export function saveUndo() {
  state.undoStack.push([...state.shapes]);
  if (state.undoStack.length > 100) state.undoStack.shift();
}

export function undo() {
  if (state.undoStack.length === 0) return;
  state.shapes = state.undoStack.pop()!;
  render();
}
