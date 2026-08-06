import type { ParseScheduleResult, ScheduleItem } from '../types'

/**
 * 解析日程文本，将多行文本转换为结构化的日程项列表
 * @param text - 输入的日程文本，每行格式为"HH:MM-HH:MM 任务内容"
 * @returns 解析结果，包含成功的日程项列表或错误信息
 */
export const parseScheduleText = (text: string): ParseScheduleResult => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const items: ScheduleItem[] = [];
  const regex = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s+(.+)$/;

  for (const content of lines) {
    const m = content.match(regex);
    if (!m) {
      return {
        items: null,
        error: `格式错误：应为 "HH:MM-HH:MM 任务内容"，错误行：${content}`
      };
    }
    const startH = parseInt(m[1], 10);
    const startM = parseInt(m[2], 10);
    const endH = parseInt(m[3], 10);
    const endM = parseInt(m[4], 10);
    if (startH > 23 || startM > 59 || endH > 23 || endM > 59) {
      return {
        items: null,
        error: `时间范围无效（小时 0-23，分钟 0-59），错误行：${content}`
      };
    }
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    if (endMin <= startMin) {
      return {
        items: null,
        error: `结束时间必须大于开始时间，错误行：${content}`
      };
    }
    items.push({
      startMin,
      endMin,
      start: m[1] + ':' + m[2],
      end: m[3] + ':' + m[4],
      title: m[5].trim(),
      durationMin: endMin - startMin
    });
  }
  if (items.length === 0) return { items: null, error: '至少需要一行有效任务' };

  // 检查时间重叠
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < sorted[i - 1].endMin) {
      const a = sorted[i - 1];
      const b = sorted[i];
      return {
        items: null,
        error: `时间重叠：「${a.start}-${a.end} ${a.title}」与「${b.start}-${b.end} ${b.title}」`
      };
    }
  }
  return { items, error: null };
}