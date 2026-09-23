const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    frame: false, // Frameless desktop window with custom titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: false, // Show when ready to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Track maximize state to notify renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: false });
  });
}

// --- IPC Handlers for Desktop Window Controls ---
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize-toggle', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// --- IPC Handlers for Local Disk Storage Persistence ---
const dataFilePath = path.join(app.getPath('userData'), 'hotel_store_backup.json');
const rootJsonPath = path.join(process.cwd(), 'hotel_data.json');

ipcMain.handle('save-disk-backup', async (event, dataString) => {
  try {
    fs.writeFileSync(dataFilePath, dataString, 'utf-8');
    try {
      fs.writeFileSync(rootJsonPath, dataString, 'utf-8');
    } catch {
      // Ignore root directory permission issues if any
    }
    return { success: true, path: rootJsonPath };
  } catch (err) {
    console.error('Failed to save disk backup:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-disk-backup', async () => {
  try {
    if (fs.existsSync(rootJsonPath)) {
      const data = fs.readFileSync(rootJsonPath, 'utf-8');
      return { success: true, data };
    }
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      return { success: true, data };
    }
    return { success: false, message: 'No backup found' };
  } catch (err) {
    console.error('Failed to load disk backup:', err);
    return { success: false, error: err.message };
  }
});

// --- IPC Handler for Direct Printing ---
ipcMain.handle('print-receipt-direct', async () => {
  if (!mainWindow) return { success: false };
  try {
    mainWindow.webContents.print({ silent: false, printBackground: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
