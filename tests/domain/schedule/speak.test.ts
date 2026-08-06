import { describe, expect, it } from 'vitest'
import { cnHourSpeak, cnMinSpeak, cnTimeRangeSpeak } from '../../../src/domain/schedule/speak'

describe('cnHourSpeak', () => {
  describe('特殊分支：0 / 10 / 20 单独处理', () => {
    it('0 点 → 零点', () => {
      expect(cnHourSpeak(0)).toBe('零点')
    })

    it('10 点 → 十点', () => {
      expect(cnHourSpeak(10)).toBe('十点')
    })

    it('20 点 → 二十点', () => {
      expect(cnHourSpeak(20)).toBe('二十点')
    })
  })

  describe('1~9 点（个位数）', () => {
    it('1 点 → 一点', () => expect(cnHourSpeak(1)).toBe('一点'))
    it('5 点 → 五点', () => expect(cnHourSpeak(5)).toBe('五点'))
    it('9 点 → 九点', () => expect(cnHourSpeak(9)).toBe('九点'))
  })

  describe('11~19 点（十几）', () => {
    it('11 点 → 十一点', () => expect(cnHourSpeak(11)).toBe('十一点'))
    it('12 点 → 十二点', () => expect(cnHourSpeak(12)).toBe('十二点'))
    it('17 点 → 十七点', () => expect(cnHourSpeak(17)).toBe('十七点'))
    it('19 点 → 十九点', () => expect(cnHourSpeak(19)).toBe('十九点'))
  })

  describe('21~23 点（二十几，通用 tens + 几十 + 个位）', () => {
    it('21 点 → 二十一点', () => expect(cnHourSpeak(21)).toBe('二十一点'))
    it('23 点 → 二十三点', () => expect(cnHourSpeak(23)).toBe('二十三点'))
  })

  describe('其他整数小时的分支也覆盖：30, 24等极端值（按代码当前实现直接走通用分支）', () => {
    it('个位数为 0 时追加「几点」（24→ 二十四点', () => {
      expect(cnHourSpeak(24)).toBe('二十四点')
    })
    it('按通用分支输出', () => {
      expect(cnHourSpeak(30)).toBe('三十点')
    })
  })
})

describe('cnMinSpeak', () => {
  it('0 分 → 空字符串（不读分钟）', () => {
    expect(cnMinSpeak(0)).toBe('')
  })

  it('10 分 → 十分', () => {
    expect(cnMinSpeak(10)).toBe('十分')
  })

  describe('1~9 分（个位数）', () => {
    it('1 分 → 一分', () => expect(cnMinSpeak(1)).toBe('一分'))
    it('5 分 → 五分', () => expect(cnMinSpeak(5)).toBe('五分'))
    it('9 分 → 九分', () => expect(cnMinSpeak(9)).toBe('九分'))
  })

  describe('11~19 分（十几）', () => {
    it('11 分 → 十一分', () => expect(cnMinSpeak(11)).toBe('十一分'))
    it('15 分 → 十五分', () => expect(cnMinSpeak(15)).toBe('十五分'))
    it('19 分 → 十九分', () => expect(cnMinSpeak(19)).toBe('十九分'))
  })

  describe('20~59 分（通用分支：几十 + 个位/整分）', () => {
    it('20 分 → 二十分', () => expect(cnMinSpeak(20)).toBe('二十分'))
    it('25 分 → 二十五分', () => expect(cnMinSpeak(25)).toBe('二十五分'))
    it('30 分 → 三十分', () => expect(cnMinSpeak(30)).toBe('三十分'))
    it('45 分 → 四十五分', () => expect(cnMinSpeak(45)).toBe('四十五分'))
    it('59 分 → 五十九分', () => expect(cnMinSpeak(59)).toBe('五十九分'))
  })
})

describe('cnTimeRange', () => {
  describe('整点（开始分钟 = 0 时省略分钟读法）', () => {
    it('07:00-08:00 → 零点到八点？按实际代码当前实现：', () => {
      expect(cnTimeRangeSpeak(7 * 60 + 0, 8 * 60 + 0)).toBe('七点到八点')
    })

    it('10:00-12:00 → 十点到十二点', () => {
      expect(cnTimeRangeSpeak(10 * 60, 12 * 60)).toBe('十点到十二点')
    })
  })

  describe('带分钟', () => {
    it('07:30-08:00 → 七点三十分到八点', () => {
      expect(cnTimeRangeSpeak(7 * 60 + 30, 8 * 60)).toBe('七点三十分到八点')
    })

    it('17:00-17:30 → 十七点到十七点三十分', () => {
      expect(cnTimeRangeSpeak(17 * 60, 17 * 60 + 30)).toBe('十七点到十七点三十分')
    })

    it('20:15-21:45 → 二十点十五分到二十一点四十五分', () => {
      expect(cnTimeRangeSpeak(20 * 60 + 15, 21 * 60 + 45)).toBe('二十点十五分到二十一点四十五分')
    })
  })

  describe('跨 0 点边界', () => {
    it('00:00-01:00 → 零点到一点', () => {
      expect(cnTimeRangeSpeak(0, 60)).toBe('零点到一点')
    })

    it('00:30-01:10 → 零点三十分到一点十分', () => {
      expect(cnTimeRangeSpeak(30, 60 + 10)).toBe('零点三十分到一点十分')
    })
  })

  describe('跨 10/20 点（特殊小时 + 分钟组合）', () => {
    it('10:10-20:20 → 十点十分到二十点二十分', () => {
      expect(cnTimeRangeSpeak(10 * 60 + 10, 20 * 60 + 20)).toBe('十点十分到二十点二十分')
    })
  })
})
