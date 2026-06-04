import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('captureAPI', {
  captureArea: (rect: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('capture-area', rect),
  updateCapture: (dataUrl: string) =>
    ipcRenderer.send('update-capture', dataUrl),
  close: () =>
    ipcRenderer.send('close-capture-overlay'),
  setIgnoreMouseEvents: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),
});
