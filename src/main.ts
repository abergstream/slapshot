import { app, BrowserWindow, ipcMain, Menu, screen } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on("resize-to-image", (_e, contentW: number, contentH: number) => {
  if (!mainWindow) return;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = Math.max(840, Math.min(contentW, sw));
  const h = Math.max(200, Math.min(contentH, sh));
  mainWindow.setContentSize(w, h);
  mainWindow.center();
});

ipcMain.on("reset-window", () => {
  if (!mainWindow) return;
  mainWindow.setSize(840, 320);
  mainWindow.center();
});

const createWindow = () => {
  if (app.dock) app.dock.setIcon(path.join(__dirname, '../../assets/icon.png'));

  mainWindow = new BrowserWindow({
    width: 840,
    height: 320,
    minWidth: 840,
    minHeight: 320,
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
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
