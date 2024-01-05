// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    ...ipcRenderer,
    on: ipcRenderer.on.bind(ipcRenderer),
    removeListener: ipcRenderer.removeListener.bind(ipcRenderer),
  },
  // Add any other modules you want to expose here
});
