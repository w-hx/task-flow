import { describe, expect, it } from 'vitest'
import { formatTime } from '../../../src/domain/schedule/format'

describe('formatTime', () => {
  describe('边界情况', () => {
    it('0 秒格式化为 0:00', () => {
      expect(formatTime(0)).toBe('0:00')
    })

    it('秒数为浮点数时向下取整', () => {
      expect(formatTime(65.9)).toBe('1:05')
    })

    it('半分钟取整', () => {
      expect(formatTime(30.5)).toBe('0:30')
    })
  })

  describe('秒数补零', () => {
    it('秒数小于 10 时补前置零', () => {
      expect(formatTime(5)).toBe('0:05')
    })

    it('秒数等于 10 时不补零', () => {
      expect(formatTime(10)).toBe('0:10')
    })

    it('秒数在 10~59 之间直接显示', () => {
      expect(formatTime(59)).toBe('0:59')
    })
  })

  describe('分钟换算', () => {
    it('正好 60 秒等于 1 分钟', () => {
      expect(formatTime(60)).toBe('1:00')
    })

    it('README 示例 65 秒等于 1:05', () => {
      expect(formatTime(65)).toBe('1:05')
    })

    it('整 2 分钟', () => {
      expect(formatTime(120)).toBe('2:00')
    })

    it('跨小时的大秒数不做小时换算', () => {
      expect(formatTime(3661)).toBe('61:01')
    })
  })

  describe('典型倒计时场景', () => {
    it('倒计时 30 秒', () => {
      expect(formatTime(30)).toBe('0:30')
    })

    it('倒计时 2 分 30 秒', () => {
      expect(formatTime(150)).toBe('2:30')
    })

    it('倒计时 9 分 59 秒', () => {
      expect(formatTime(599)).toBe('9:59')
    })

    it('倒计时 10 分 0 秒', () => {
      expect(formatTime(600)).toBe('10:00')
    })
  })
})
