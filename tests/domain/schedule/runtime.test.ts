import { describe, expect, it } from 'vitest'
import { getCurrentTask, getNextTask } from '../../../src/domain/schedule/runtime'
import type { Schedule } from '../../../src/domain/types'

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'sched-1',
  name: '工作日',
  items: [
    { startMin: 450, endMin: 480, start: '07:30', end: '08:00', title: '早餐', durationMin: 30 },
    { startMin: 480, endMin: 540, start: '08:00', end: '09:00', title: '通勤', durationMin: 60 },
    { startMin: 540, endMin: 690, start: '09:00', end: '11:30', title: '深度工作', durationMin: 150 }
  ],
  soundStart: 'success',
  soundEnd: 'chime',
  speakEnabled: true,
  speakVoice: '',
  speakRate: 1.0,
  speakVolume: 1.0,
  updatedAt: 0,
  ...overrides
})

const schedules = [makeSchedule()]

describe('getCurrentTask', () => {
  describe('空值与边界情况', () => {
    it('runningId 为空时返回 null', () => {
      expect(getCurrentTask('', schedules, 460 * 60)).toBeNull()
      expect(getCurrentTask(null as unknown as string, schedules, 460 * 60)).toBeNull()
    })

    it('找不到对应日程时返回 null', () => {
      expect(getCurrentTask('no-such-id', schedules, 460 * 60)).toBeNull()
    })

    it('日程 items 为空时返回 null', () => {
      const empty = [makeSchedule({ id: 'empty', items: [] })]
      expect(getCurrentTask('empty', empty, 460 * 60)).toBeNull()
    })

    it('日程 items 为 undefined 时返回 null', () => {
      const broken = [{ ...makeSchedule({ id: 'broken' }), items: undefined as unknown as [] }]
      expect(getCurrentTask('broken', broken, 460 * 60)).toBeNull()
    })
  })

  describe('时间段匹配', () => {
    it('在任务开始瞬间命中（左闭区间）', () => {
      // 07:30:00 刚好是 早餐 的开始秒
      const nowSec = 450 * 60
      const result = getCurrentTask('sched-1', schedules, nowSec)
      expect(result).not.toBeNull()
      expect(result!.rawTitle).toBe('早餐')
      expect(result!.remaining).toBe(30 * 60)
      expect(result!.total).toBe(30 * 60)
    })

    it('在任务中间命中，剩余时间递减', () => {
      // 07:35:00 → 早餐已经过了 5 分钟
      const nowSec = (450 + 5) * 60
      const result = getCurrentTask('sched-1', schedules, nowSec)
      expect(result).not.toBeNull()
      expect(result!.rawTitle).toBe('早餐')
      expect(result!.remaining).toBe((30 - 5) * 60)
      expect(result!.total).toBe(30 * 60)
    })

    it('在任务结束瞬间不命中（右开区间）', () => {
      // 08:00:00 刚好是 早餐 的结束秒，同时是 通勤 的开始秒
      const nowSec = 480 * 60
      const result = getCurrentTask('sched-1', schedules, nowSec)
      expect(result).not.toBeNull()
      // 应该命中通勤（右开：07:30-08:00 在 08:00 整点不包含；左闭：08:00-09:00 在 08:00 整点包含）
      expect(result!.rawTitle).toBe('通勤')
    })

    it('在所有任务之前返回 null', () => {
      expect(getCurrentTask('sched-1', schedules, 0)).toBeNull() // 00:00
      expect(getCurrentTask('sched-1', schedules, (450 - 1) * 60)).toBeNull() // 07:29
    })

    it('在所有任务之后返回 null', () => {
      expect(getCurrentTask('sched-1', schedules, 690 * 60)).toBeNull() // 11:30 整点
      expect(getCurrentTask('sched-1', schedules, 23 * 3600 + 59 * 60)).toBeNull() // 23:59
    })
  })

  describe('返回字段结构', () => {
    it('正确组装 title 被『』包裹、rawTitle、时间字段、sound 默认值', () => {
      const nowSec = 540 * 60 // 09:00 深度工作 开始
      const result = getCurrentTask('sched-1', schedules, nowSec)
      expect(result).toEqual({
        title: '『深度工作』',
        rawTitle: '深度工作',
        startMin: 540,
        endMin: 690,
        remaining: 150 * 60,
        total: 150 * 60,
        key: '540-690-深度工作',
        endSec: 690 * 60,
        soundStart: 'success',
        soundEnd: 'chime'
      })
    })

    it('soundStart / soundEnd 缺省时使用默认值', () => {
      const noSound = [makeSchedule({
        id: 'no-sound',
        soundStart: undefined as unknown as string,
        soundEnd: undefined as unknown as string
      })]
      const result = getCurrentTask('no-sound', noSound, 450 * 60)
      expect(result).not.toBeNull()
      expect(result!.soundStart).toBe('success')
      expect(result!.soundEnd).toBe('chime')
    })

    it('soundStart / soundEnd 使用自定义值', () => {
      const customSound = [makeSchedule({
        id: 'custom-sound',
        soundStart: 'magic',
        soundEnd: 'electronic'
      })]
      const result = getCurrentTask('custom-sound', customSound, 480 * 60 + 10)
      expect(result).not.toBeNull()
      expect(result!.soundStart).toBe('magic')
      expect(result!.soundEnd).toBe('electronic')
    })

    it('key 由 startMin-endMin-title 拼接', () => {
      const result = getCurrentTask('sched-1', schedules, (450 + 15) * 60)
      expect(result).not.toBeNull()
      expect(result!.key).toBe('450-480-早餐')
    })
  })
})

describe('getNextTask', () => {
  describe('空值与边界情况', () => {
    it('runningId 为空时返回 null', () => {
      expect(getNextTask('', schedules, 460 * 60)).toBeNull()
      expect(getNextTask(null as unknown as string, schedules, 460 * 60)).toBeNull()
    })

    it('找不到对应日程时返回 null', () => {
      expect(getNextTask('no-such-id', schedules, 460 * 60)).toBeNull()
    })

    it('日程 items 为空时返回 null', () => {
      const empty = [makeSchedule({ id: 'empty', items: [] })]
      expect(getNextTask('empty', empty, 460 * 60)).toBeNull()
    })
  })

  describe('存在下一个任务时（不回环）', () => {
    it('当前在早餐中，下一个是通勤', () => {
      const result = getNextTask('sched-1', schedules, 460 * 60) // 07:40
      expect(result).toEqual({ title: '通勤', start: '08:00' })
    })

    it('当前在通勤中，下一个是深度工作', () => {
      const result = getNextTask('sched-1', schedules, 485 * 60) // 08:05
      expect(result).toEqual({ title: '深度工作', start: '09:00' })
    })

    it('所有任务结束之前的空闲，取第一个即将开始的任务', () => {
      const result = getNextTask('sched-1', schedules, 7 * 3600) // 07:00，早于早餐
      expect(result).toEqual({ title: '早餐', start: '07:30' })
    })

    it('紧邻开始时间之前的瞬间，仍能取到该任务', () => {
      // 07:29:59 —— 早餐 07:30 开始，还没进入 currentTask，但 upcoming 已经包含它
      const result = getNextTask('sched-1', schedules, 450 * 60 - 1)
      expect(result).toEqual({ title: '早餐', start: '07:30' })
    })

    it('开始瞬间之后（已进入 currentTask），upcoming 取后续的下一个', () => {
      // 07:30:01 已进入 早餐 → upcoming 跳过它，取下一个即 通勤
      const result = getNextTask('sched-1', schedules, 450 * 60 + 1)
      expect(result).toEqual({ title: '通勤', start: '08:00' })
    })

    it('items 乱序时，仍按 startMin 升序选出即将到来的那一个', () => {
      const shuffled = [makeSchedule({
        id: 'shuffled',
        items: [
          { startMin: 540, endMin: 690, start: '09:00', end: '11:30', title: '深度工作', durationMin: 150 },
          { startMin: 450, endMin: 480, start: '07:30', end: '08:00', title: '早餐', durationMin: 30 },
          { startMin: 480, endMin: 540, start: '08:00', end: '09:00', title: '通勤', durationMin: 60 }
        ]
      })]
      // 07:00 时 upcoming 包含全部 3 个；排序后最先的是 早餐
      const result = getNextTask('shuffled', shuffled, 7 * 3600)
      expect(result).toEqual({ title: '早餐', start: '07:30' })
    })
  })

  describe('所有任务已结束时回环到最早的任务', () => {
    it('当前在最后一个任务结束之后，取 startMin 最小的任务（回环）', () => {
      // 12:00（690 之后），最后一个任务已结束
      const result = getNextTask('sched-1', schedules, 12 * 3600)
      expect(result).toEqual({ title: '早餐', start: '07:30' })
    })

    it('23:59 时依然回环到最早的任务', () => {
      const result = getNextTask('sched-1', schedules, 23 * 3600 + 59 * 60 + 59)
      expect(result).toEqual({ title: '早餐', start: '07:30' })
    })

    it('items 乱序时回环依然取 startMin 最小的', () => {
      const shuffled = [makeSchedule({
        id: 'shuffled-2',
        items: [
          { startMin: 540, endMin: 690, start: '09:00', end: '11:30', title: '深度工作', durationMin: 150 },
          { startMin: 480, endMin: 540, start: '08:00', end: '09:00', title: '通勤', durationMin: 60 },
          { startMin: 450, endMin: 480, start: '07:30', end: '08:00', title: '早餐', durationMin: 30 }
        ]
      })]
      const result = getNextTask('shuffled-2', shuffled, 22 * 3600)
      expect(result).toEqual({ title: '早餐', start: '07:30' })
    })
  })
})
