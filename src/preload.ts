import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  resizeToImage: (contentW: number, contentH: number) =>
    ipcRenderer.send('resize-to-image', contentW, contentH),
  resetWindow: () =>
    ipcRenderer.send('reset-window'),
});
