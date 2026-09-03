/// <reference types="vite/client" />

// preload (src/preload/index.js) 通过 contextBridge 暴露给渲染进程的 API
declare global {
  interface Window {
    taskFlowAPI: {
      getSchedules: () => Promise<{
        schedules: import('../domain/types').Schedule[]
        activeId: string | null
        runningId: string | null
        lastModifiedId: string | null
      }>
      saveSchedules: (data: {
        schedules: import('../domain/types').Schedule[]
        activeId: string | null
        runningId: string | null
        lastModifiedId: string | null
      }) => Promise<unknown>
      parseSchedule: (text: string) => Promise<import('../domain/types').ParseScheduleResult>
      setRunning: (id: string | null) => Promise<unknown>
      previewSound: (soundId: string) => Promise<unknown>
      getVoices: () => Promise<{ zh: { name: string; lang?: string }[]; all: { name: string; lang?: string }[] } | null>
      previewSpeak: (payload: { text: string; voiceName: string; rate: number; volume: number }) => Promise<unknown>
    }
  }
}

export {}
