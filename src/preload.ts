import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  resizeToImage: (contentW: number, contentH: number) =>
    ipcRenderer.send('resize-to-image', contentW, contentH),
  resetWindow: () =>
    ipcRenderer.send('reset-window'),
  startScrollCapture: () =>
    ipcRenderer.invoke('open-capture-overlay'),
  onCapturedImage: (callback: (dataUrl: string) => void) =>
    ipcRenderer.on('load-captured-image', (_e, dataUrl: string) => callback(dataUrl)),
  writeImageToClipboard: (dataUrl: string) =>
    ipcRenderer.invoke('write-image-to-clipboard', dataUrl),
  onHotkeyCopy: (cb: () => void) =>
    ipcRenderer.on('hotkey-copy', cb),
});
