import './index.css';
import './ui/colors';
import './ui/toolbar';
import './ui/paste';
import './ui/export';
import './canvas/drawing';
import './canvas/text';

import { newSession } from './ui/paste';
import { undo, redo } from './core/history';
import { saveToFile, copyToClipboard } from './ui/export';
import { setTool } from './ui/toolbar';
import type { Tool } from './core/types';

const isMac = navigator.platform.startsWith('Mac');

(document.getElementById('paste-hint-key') as HTMLElement).textContent = isMac ? 'Cmd+V' : 'Ctrl+V';

document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && e.key === 'n') { e.preventDefault(); newSession();        return; }
  if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); return; }
  if (mod && e.key === 's') { e.preventDefault(); saveToFile();        return; }
  if (mod && e.shiftKey && e.key === 'C') { e.preventDefault(); copyToClipboard(); return; }

  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    const map: Record<string, Tool> = { a: 'arrow', r: 'rect', e: 'circle', p: 'pen', h: 'highlight', t: 'text' };
    if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
  }
});
