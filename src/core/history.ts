import { state } from './state';
import { render } from '../canvas/render';

export function saveUndo() {
  state.undoStack.push([...state.shapes]);
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
}

export function undo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push([...state.shapes]);
  state.shapes = state.undoStack.pop()!;
  render();
}

export function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push([...state.shapes]);
  state.shapes = state.redoStack.pop()!;
  render();
}
