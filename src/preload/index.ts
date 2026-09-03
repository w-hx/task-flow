import { contextBridge, ipcRenderer } from 'electron'
import type { ScheduleJson } from '../domain/types'

// preview-speak 载荷：与 main/index.ts 中 preview-speak handler 读取的字段对齐
type PreviewSpeakPayload = {
  text: string
  voiceName?: string
  rate?: number
  volume?: number
}

contextBridge.exposeInMainWorld('taskFlowAPI', {
  getSchedules: (): Promise<ScheduleJson> => ipcRenderer.invoke('get-schedules'),
  saveSchedules: (data: ScheduleJson): Promise<boolean> => ipcRenderer.invoke('save-schedules', data),
  parseSchedule: (text: string): Promise<unknown> => ipcRenderer.invoke('parse-schedule', text),
  setRunning: (id: string | null): Promise<boolean> => ipcRenderer.invoke('set-running', id),
  previewSound: (soundId: string): Promise<boolean> => ipcRenderer.invoke('preview-sound', soundId),
  getVoices: (): Promise<{ zh: string[]; all: string[] }> => ipcRenderer.invoke('get-voices'),
  previewSpeak: (payload: PreviewSpeakPayload): Promise<boolean> => ipcRenderer.invoke('preview-speak', payload)
})
