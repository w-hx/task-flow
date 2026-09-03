import { contextBridge, ipcRenderer } from 'electron'

// 与 main/index.ts 中 updateTrayImage 发送的载荷字段对齐
type RenderTrayTextPayload = {
  taskNamePart: string
  timePart: string
}

contextBridge.exposeInMainWorld('trayAPI', {
  onRenderRequest: (cb: (data: RenderTrayTextPayload) => void) =>
    ipcRenderer.on('render-tray-text', (e, data) => cb(data)),
  sendImage: (dataUrl: string): void => {
    ipcRenderer.send('tray-image-ready', dataUrl)
  },
  onPlaySound: (cb: (soundId: string) => void) => ipcRenderer.on('play-sound', (e, soundId) => cb(soundId)),
  onSpeakText: (cb: (data: unknown) => void) => ipcRenderer.on('speak-text', (e, data) => cb(data)),
  sendVoices: (voices: { zh: string[]; all: string[] }): void => {
    ipcRenderer.send('voices-ready', voices)
  }
})
