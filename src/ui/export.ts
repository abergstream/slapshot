import { canvas, state } from '../core/state';

function exportBlob(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
}

export function flashButton(id: string) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.add('success');
  setTimeout(() => btn.classList.remove('success'), 1200);
}

export async function copyToClipboard() {
  if (!state.bgImage) return;
  try {
    const blob = await exportBlob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    flashButton('copyBtn');
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

export async function saveToFile() {
  if (!state.bgImage) return;
  const blob = await exportBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'slapshot.png';
  a.click();
  URL.revokeObjectURL(url);
  flashButton('saveBtn');
}

document.getElementById('copyBtn')!.addEventListener('click', copyToClipboard);
document.getElementById('saveBtn')!.addEventListener('click', saveToFile);
