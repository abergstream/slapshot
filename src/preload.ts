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
  setMinWidth: (width: number) =>
    ipcRenderer.send('set-min-width', width),
  onUpdateAvailable: (cb: () => void) =>
    ipcRenderer.on('update-available', cb),
  onUpdateDownloaded: (cb: () => void) =>
    ipcRenderer.on('update-downloaded', cb),
  onUpdateError: (cb: (msg: string) => void) =>
    ipcRenderer.on('update-error', (_e, msg: string) => cb(msg)),
  downloadUpdate: () =>
    ipcRenderer.send('download-update'),
  installUpdate: () =>
    ipcRenderer.send('install-update'),
});
