const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trayAPI', {
  onRenderRequest: (cb) => ipcRenderer.on('render-tray-text', (e, data) => cb(data)),
  sendImage: (dataUrl) => ipcRenderer.send('tray-image-ready', dataUrl),
  onPlaySound: (cb) => ipcRenderer.on('play-sound', (e, soundId) => cb(soundId))
});
