const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskFlowAPI', {
  getSchedules: () => ipcRenderer.invoke('get-schedules'),
  saveSchedules: (data) => ipcRenderer.invoke('save-schedules', data),
  parseSchedule: (text) => ipcRenderer.invoke('parse-schedule', text),
  setRunning: (id) => ipcRenderer.invoke('set-running', id),
  previewSound: (soundId) => ipcRenderer.invoke('preview-sound', soundId)
});
