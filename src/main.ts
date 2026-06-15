import {
  app,
  autoUpdater,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  ipcMain,
  Menu,
  nativeImage,
  net,
  screen,
} from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

if (started) {
  app.quit();
}

const FEED_URL = `https://update.electronjs.org/abergstream/slapshot/${process.platform}-${process.arch}/${app.getVersion()}`;

async function checkForUpdate() {
  try {
    const res = await net.fetch(FEED_URL);
    if (res.status !== 204) {
      mainWindow?.webContents.send("update-available");
    }
  } catch {
    // ignore network errors silently
  }
}

if (app.isPackaged) {
  autoUpdater.setFeedURL({ url: FEED_URL });

  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update-downloaded");
  });
}

ipcMain.on("download-update", () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on("install-update", () => {
  autoUpdater.quitAndInstall();
});
let toolbarMinWidth = 1024;
const minHeight = 300;
let mainWindow: BrowserWindow | null = null;
let overlayWindows: BrowserWindow[] = [];

ipcMain.on("set-min-width", (_e, width: number) => {
  toolbarMinWidth = Math.max(width, 1024);
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
  mainWindow.setSize(toolbarMinWidth, 320);
});

ipcMain.handle("open-capture-overlay", () => {
  const alive = overlayWindows.filter((w) => !w.isDestroyed());
  if (alive.length > 0) {
    alive[0].focus();
    return;
  }

  overlayWindows = screen.getAllDisplays().map((display) => {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      hasShadow: false,
      skipTaskbar: true,
      resizable: false,
      backgroundColor: "#00000000",
      webPreferences: {
        preload: path.join(__dirname, "capture-preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + "/capture.html");
    } else {
      win.loadFile(
        path.join(
          __dirname,
          `../renderer/${MAIN_WINDOW_VITE_NAME}/capture.html`,
        ),
      );
    }

    win.on("closed", () => {
      overlayWindows = overlayWindows.filter((w) => w !== win);
    });

    return win;
  });
});

ipcMain.handle(
  "capture-area",
  async (e, rect: { x: number; y: number; width: number; height: number }) => {
    // Each overlay window covers exactly one display, so its bounds ARE the display bounds.
    const callerWin = BrowserWindow.fromWebContents(e.sender);
    const winBounds = callerWin?.getBounds() ?? { x: 0, y: 0 };

    // Hide all overlays so they don't appear in the screenshot
    for (const w of overlayWindows) if (!w.isDestroyed()) w.hide();
    await new Promise((r) => setTimeout(r, 200));

    const allDisplays = screen.getAllDisplays();
    const targetDisplay =
      allDisplays.find(
        (d) => d.bounds.x === winBounds.x && d.bounds.y === winBounds.y,
      ) ?? screen.getPrimaryDisplay();

    const sf = targetDisplay.scaleFactor;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: Math.round(targetDisplay.bounds.width * sf),
        height: Math.round(targetDisplay.bounds.height * sf),
      },
    });

    for (const w of overlayWindows) if (!w.isDestroyed()) w.show();
    if (!sources.length) throw new Error("No screen source available");

    const displayIndex = allDisplays.indexOf(targetDisplay);
    const source =
      sources.find((s) => s.display_id === String(targetDisplay.id)) ??
      sources[Math.min(displayIndex, sources.length - 1)];

    // Selection coords are relative to the overlay window which equals the display origin,
    // so no offset needed — just scale by the display's scale factor.
    const cropped = source.thumbnail.crop({
      x: Math.round(rect.x * sf),
      y: Math.round(rect.y * sf),
      width: Math.round(rect.width * sf),
      height: Math.round(rect.height * sf),
    });

    return cropped.toDataURL();
  },
);

ipcMain.on("update-capture", (_e, dataUrl: string) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("load-captured-image", dataUrl);
    mainWindow.focus();
  }
});

ipcMain.on("close-capture-overlay", () => {
  for (const w of overlayWindows) if (!w.isDestroyed()) w.close();
  overlayWindows = [];
});

ipcMain.on("set-ignore-mouse-events", (e, ignore: boolean) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.handle("write-image-to-clipboard", (_e, dataUrl: string) => {
  clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
});

const createWindow = () => {
  if (app.dock) app.dock.setIcon(path.join(__dirname, "../../assets/icon.png"));

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

  if (app.isPackaged) {
    mainWindow.webContents.on("did-finish-load", checkForUpdate);
  }

  // Intercept Ctrl/Cmd+Shift+C before Chromium treats it as "Inspect Element".
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const mod = process.platform === "darwin" ? input.meta : input.control;
    if (mod && input.shift && input.code === "KeyC") {
      event.preventDefault();
      mainWindow?.webContents.send("hotkey-copy");
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
