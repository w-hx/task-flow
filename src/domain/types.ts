// 时间表每一行格式化后的标准数据结构
export type ScheduleItem = {
  startMin: number // 480
  endMin: number // 490
  start: string // "8:00"
  end: string // "8:10"
  title: string // "吃早餐"
  durationMin: number // "10"
}

export type TaskForTray = {
  title: string, // "「吃早餐」"
  rawTitle: string, // "吃早餐"
  startMin: number, // 480
  endMin: number, // 490
  remaining: number, // （目前剩余秒数）
  total: number // 600 （总秒数）
  key: string, // `${startMin}-${endMin}-${title}`
  endSec: number,  // 结束时间点的秒数
  soundStart: string,
  soundEnd: string
}

export type NextTask = {
  title: string, // "吃早餐"
  start: string // "8:00"
}

// 解析时间表文本返回的结果
export type ParseScheduleResult =
  | { items: ScheduleItem[]; error: null }
  | { items: null; error: string }

// 时间表数据结构
export type Schedule = {
  id: string
  name: string
  items: ScheduleItem[]
  soundStart: string
  soundEnd: string
  speakEnabled: boolean
  speakVoice: string
  speakRate: number
  speakVolume: number
  updatedAt: number
}

// 时间表池，schedules.json 的数据结构
export type ScheduleJson = {
  schedules: Schedule[]
  activeId: string | null // 用户当前选中的时间表
  runningId: string | null
  lastModifiedId: string | null
}