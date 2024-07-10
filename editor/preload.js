const { contextBridge, ipcRenderer } = require('electron');

window.ipcRenderer = require('electron').ipcRenderer

contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    const validChannels = ['save-content', 'get-directory-structure', 'open-file-from-tree'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['save-file', 'open-file', 'directory-structure'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});