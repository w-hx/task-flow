import { describe, expect, it } from 'vitest'
import { parseScheduleText } from '../../../src/domain/schedule/parser'

describe('parseScheduleText', () => {
  it('解析有效的单个任务', () => {
    const result = parseScheduleText('07:30-08:00 早餐')
    
    expect(result).toEqual({
      items: [
        {
          startMin: 450,
          endMin: 480,
          start: '07:30',
          end: '08:00',
          title: '早餐',
          durationMin: 30
        }
      ],
      error: null
    })
  })

  it('拒绝空白文本', () => {
    const result = parseScheduleText('     ')

    expect(result).toEqual({
      items: null,
      error: expect.stringContaining('至少需要一行')
    })
  })

  it('拒绝不符合格式的文本', () => {
    const result = parseScheduleText('早餐')

    expect(result).toEqual({
      items: null,
      error: expect.stringContaining('格式错误')
    })
  })

  it('拒绝时间重叠', () => {
    const result = parseScheduleText('7:30-08:00 早餐 \n 7:55-8:25 晨练')

    expect(result).toEqual({
      items: null,
      error: expect.stringContaining('时间重叠')
    })
  })

  it('拒绝结束时间早于开始时间', () => {
    const result = parseScheduleText('08:00-07:30 早餐')

    expect(result).toEqual({
      items: null,
      error: expect.stringContaining('结束时间必须大于开始时间')
    })
  })
})