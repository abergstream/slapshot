import './index.css';
import './ui/colors';
import './ui/toolbar';
import './ui/paste';
import './ui/export';
import './canvas/drawing';
import './canvas/text';

import { newSession } from './ui/paste';
import { undo } from './core/history';
import { saveToFile, copyToClipboard } from './ui/export';
import { setTool } from './ui/toolbar';
import type { Tool } from './core/types';

document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (e.ctrlKey && e.key === 'n') { e.preventDefault(); newSession();        return; }
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo();              return; }
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveToFile();        return; }
  if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); copyToClipboard(); return; }

  if (!e.ctrlKey && !e.altKey) {
    const map: Record<string, Tool> = { a: 'arrow', r: 'rect', e: 'circle', p: 'pen', h: 'highlight', t: 'text' };
    if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
  }
});
