import { create } from 'zustand';
import type { Schedule, ScheduleItem } from '../../domain/types'

const MAX_SCHEDULES = 10

// renderer.js L10: availableVoices 的形状
export interface VoiceInfo { name: string; lang?: string }
export interface Voices { zh: VoiceInfo[]; all: VoiceInfo[] }

// 表单提交的数据（对应 renderer.js doCreate/doEditSave 从 DOM 读的值，L376-383 / L428-435）
export interface ScheduleInput {
  name: string
  content: string
  soundStart: string
  soundEnd: string
  speakVoice: string   // '__none__' 表示关闭朗读
  speakRate: number
}

interface RendererStore {
  // ===== 数据（对应 renderer.js L3-11 的 state 对象）=====
  schedules: Schedule[]
  activeId: string | null
  runningId: string | null
  lastModifiedId: string | null
  deleteMode: boolean
  availableVoices: Voices | null

  // ===== 数据层（对应 L148-164）=====
  init: () => Promise<void>          // 启动时调用一次：加载数据 + 语音 + 同步 runningId
  save: () => Promise<void>          // 内部持久化，动作里自动调用

  // ===== 业务动作（对应 renderer.js 各函数）=====
  selectSchedule: (id: string) => void          // L367 selectSchedule
  createSchedule: (input: ScheduleInput) => Promise<string | null>  // L375 doCreate，返回错误信息或 null
  updateSchedule: (input: ScheduleInput) => Promise<string | null>  // L424 doEditSave
  toggleRun: () => Promise<void>                // L469 toggleRun
  deleteSchedule: (id: string) => Promise<void> // L484 deleteSchedule
  toggleDeleteMode: () => void                  // L503
  exitDeleteMode: () => void                    // L512
  loadVoices: () => Promise<void>               // L625 loadVoicesWithRetry
}

function generateId(): string {
  return 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9) // L371
}

export const useRendererStore = create<RendererStore>((set, get) => ({
  // ===== 初始数据 =====
  schedules: [],
  activeId: null,
  runningId: null,
  lastModifiedId: null,
  deleteMode: false,
  availableVoices: null,

  // ===== 数据层 =====
  init: async () => {
    // 对应 renderer.js L643-655 的启动流程
    const data = await window.taskFlowAPI.getSchedules()
    set({
      schedules: data.schedules || [],
      activeId: data.activeId,
      runningId: data.runningId,
      lastModifiedId: data.lastModifiedId || null
    })
    await get().loadVoices()
    await window.taskFlowAPI.setRunning(get().runningId)
  },

  save: async () => {
    // 对应 renderer.js L156-163
    const { schedules, activeId, runningId, lastModifiedId } = get()
    await window.taskFlowAPI.saveSchedules({ schedules, activeId, runningId, lastModifiedId })
  },

  // ===== 业务动作 =====
  selectSchedule: (id) => {
    set({ activeId: id, lastModifiedId: id }) // 对应 L327-328 showEditPanel 里的两行
  },

  createSchedule: async (input) => {
    // 对应 renderer.js L375-422 doCreate
    const { name, content, soundStart, soundEnd, speakVoice, speakRate } = input
    if (!name) return '请输入时间表名称'
    if (!content) return '请输入时间表内容'
    if (get().schedules.length >= MAX_SCHEDULES) return `最多存储 ${MAX_SCHEDULES} 个时间表，请先删除再添加`

    const result = await window.taskFlowAPI.parseSchedule(content)
    if (result.error) return result.error

    const speakEnabled = speakVoice !== '__none__'
    const schedule: Schedule = {
      id: generateId(),
      name,
      soundStart,
      soundEnd,
      speakEnabled,
      speakVoice: speakEnabled ? speakVoice : '',
      speakRate,
      speakVolume: 1.0,
      items: (result.items ?? []) as ScheduleItem[],
      updatedAt: Date.now()
    }
    set((s) => ({
      schedules: [...s.schedules, schedule],
      activeId: schedule.id,       // 对应 doCreate 末尾的 showEditPanel(schedule.id)
      lastModifiedId: schedule.id
    }))
    await get().save()
    return null
  },

  updateSchedule: async (input) => {
    // 对应 renderer.js L424-467 doEditSave
    const id = get().activeId
    if (!id || get().runningId === id) return null // L426: 运行中禁止编辑

    const { name, content, soundStart, soundEnd, speakVoice, speakRate } = input
    if (!name) return '请输入时间表名称'
    if (!content) return '请输入时间表内容'

    const result = await window.taskFlowAPI.parseSchedule(content)
    if (result.error) return result.error

    const speakEnabled = speakVoice !== '__none__'
    set((s) => ({
      schedules: s.schedules.map((x) =>
        x.id === id
          ? {
              ...x,
              name,
              items: (result.items ?? []) as ScheduleItem[],
              soundStart,
              soundEnd,
              speakEnabled,
              speakVoice: speakEnabled ? speakVoice : '',
              speakRate,
              updatedAt: Date.now()
            }
          : x
      ),
      lastModifiedId: id
    }))
    await get().save()
    return null
  },

  toggleRun: async () => {
    // 对应 renderer.js L469-482
    const { activeId, runningId } = get()
    if (!activeId) return
    const nextRunningId = runningId === activeId ? null : activeId
    set({ runningId: nextRunningId })
    await get().save()
    await window.taskFlowAPI.setRunning(nextRunningId)
  },

  deleteSchedule: async (id) => {
    // 对应 renderer.js L484-501
    const wasRunning = get().runningId === id
    set((s) => ({
      schedules: s.schedules.filter((x) => x.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
      runningId: s.runningId === id ? null : s.runningId,
      lastModifiedId: s.lastModifiedId === id ? null : s.lastModifiedId
    }))
    await get().save()
    if (wasRunning) await window.taskFlowAPI.setRunning(null)
  },

  toggleDeleteMode: () => set((s) => ({ deleteMode: !s.deleteMode })), // L503
  exitDeleteMode: () => set({ deleteMode: false }),                    // L512

  loadVoices: async () => {
    // 对应 renderer.js L625-641 loadVoicesWithRetry
    const tryLoad = async (retries: number): Promise<void> => {
      try {
        const voices = await window.taskFlowAPI.getVoices()
        if (voices && (voices.zh || voices.all) && (voices.zh.length + voices.all.length) > 0) {
          set({ availableVoices: voices })
          return
        }
      } catch (e) {
        console.warn('Get voices error (retrying):', e)
      }
      if (retries <= 0) {
        set({ availableVoices: { zh: [], all: [] } })
        return
      }
      await new Promise((r) => setTimeout(r, 400))
      return tryLoad(retries - 1)
    }
    await tryLoad(8)
  }
}))
