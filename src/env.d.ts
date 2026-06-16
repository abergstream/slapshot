declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface Window {
  electronAPI?: {
    resizeToImage: (contentW: number, contentH: number) => void;
    resetWindow: () => void;
    startScrollCapture: () => void;
    onCapturedImage: (callback: (dataUrl: string) => void) => void;
    writeImageToClipboard: (dataUrl: string) => Promise<void>;
    onHotkeyCopy: (cb: () => void) => void;
    setMinWidth: (width: number) => void;
    onUpdateAvailable: (cb: () => void) => void;
    onUpdateDownloaded: (cb: () => void) => void;
    onUpdateError: (cb: (msg: string) => void) => void;
    downloadUpdate: () => void;
    installUpdate: () => void;
  };
  captureAPI?: {
    captureArea: (rect: { x: number; y: number; width: number; height: number }) => Promise<string>;
    updateCapture: (dataUrl: string) => void;
    close: () => void;
    setIgnoreMouseEvents: (ignore: boolean) => void;
  };
}
