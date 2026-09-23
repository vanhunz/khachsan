const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  isDesktopApp: true,
  appName: 'KhachSan Desktop POS',
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window-maximize-toggle'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (event, state) => callback(state));
  },
  // Disk persistence
  saveDiskBackup: (data) => ipcRenderer.invoke('save-disk-backup', data),
  loadDiskBackup: () => ipcRenderer.invoke('load-disk-backup'),
  // Printing
  printReceiptDirect: () => ipcRenderer.invoke('print-receipt-direct'),
});
