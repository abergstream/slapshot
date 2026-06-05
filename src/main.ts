import { app, BrowserWindow, clipboard, desktopCapturer, ipcMain, Menu, nativeImage, screen } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}
let toolbarMinWidth = 860;
const minHeight = 300;
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

ipcMain.on("set-min-width", (_e, width: number) => {
  toolbarMinWidth = width;
  mainWindow?.setMinimumSize(toolbarMinWidth, minHeight);
});

ipcMain.on("resize-to-image", (_e, contentW: number, contentH: number) => {
  if (!mainWindow) return;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = Math.max(toolbarMinWidth, Math.min(contentW, sw));
  const h = Math.max(minHeight, Math.min(contentH, sh));
  mainWindow.setContentSize(w, h);
});

ipcMain.on("reset-window", () => {
  if (!mainWindow) return;
  mainWindow.setSize(840, 320);
  mainWindow.center();
});

ipcMain.handle("open-capture-overlay", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return;
  }

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  overlayWindow = new BrowserWindow({
    x, y, width, height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, "capture-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '/capture.html');
  } else {
    overlayWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/capture.html`)
    );
  }

  overlayWindow.on('closed', () => { overlayWindow = null; });
});

ipcMain.handle("capture-area", async (_e, rect: { x: number; y: number; width: number; height: number }) => {
  // Read the window's actual on-screen position before hiding it.
  // On macOS the menu bar pushes the window down, so its reported y is not 0.
  const winBounds = (overlayWindow && !overlayWindow.isDestroyed())
    ? overlayWindow.getBounds()
    : { x: 0, y: 0 };

  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();

  // Wait for the OS to remove the overlay from the composited frame
  await new Promise(r => setTimeout(r, 200));

  const display = screen.getPrimaryDisplay();
  const sf = display.scaleFactor;
  const { width: sw, height: sh } = display.bounds;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(sw * sf), height: Math.round(sh * sf) },
  });

  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.show();

  if (!sources.length) throw new Error('No screen source available');

  // Selection coords are relative to the overlay window's client area.
  // Add the window's screen position to get absolute screen coordinates.
  const thumbnail = sources[0].thumbnail;
  const cropped = thumbnail.crop({
    x: Math.round((winBounds.x + rect.x) * sf),
    y: Math.round((winBounds.y + rect.y) * sf),
    width: Math.round(rect.width * sf),
    height: Math.round(rect.height * sf),
  });

  return cropped.toDataURL();
});

ipcMain.on("update-capture", (_e, dataUrl: string) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('load-captured-image', dataUrl);
    mainWindow.focus();
  }
});

ipcMain.on("close-capture-overlay", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
});

ipcMain.on("set-ignore-mouse-events", (_e, ignore: boolean) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.handle("write-image-to-clipboard", (_e, dataUrl: string) => {
  clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
});

const createWindow = () => {
  if (app.dock) app.dock.setIcon(path.join(__dirname, '../../assets/icon.png'));

  mainWindow = new BrowserWindow({
    width: toolbarMinWidth,
    height: 320,
    minWidth: toolbarMinWidth,
    minHeight: minHeight,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  Menu.setApplicationMenu(null);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Intercept Ctrl/Cmd+Shift+C before Chromium treats it as "Inspect Element".
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const mod = process.platform === 'darwin' ? input.meta : input.control;
    if (mod && input.shift && input.code === 'KeyC') {
      event.preventDefault();
      mainWindow?.webContents.send('hotkey-copy');
    }
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
