import { Schedule, TaskForTray, NextTask } from "../types";
/**
 * 获取当前正在执行的任务信息，用于系统托盘计时器显示
 * @param runningId 当前正在运行的日程ID
 * @param schedules 所有日程列表
 * @param nowSec 当前时间的秒数（从当天0点开始计算）
 * @returns 符合托盘计时器要求的任务对象，若没有正在执行的任务则返回null
 */
export const getCurrentTask = (runningId: string, schedules: Schedule[], nowSec: number): TaskForTray | null => {
  if (!runningId) return null;
  const s = schedules.find((x) => x.id === runningId);
  if (!s || !s.items || s.items.length === 0) return null;
  for (const it of s.items) {
    const startSec = it.startMin * 60;
    const endSec = it.endMin * 60;
    if (nowSec >= startSec && nowSec < endSec) {
      const totalSec = (it.endMin - it.startMin) * 60;
      const remaining = totalSec - (nowSec - startSec);
      const key = `${it.startMin}-${it.endMin}-${it.title}`;
      return {
        title: '『' + it.title + '』', 
        rawTitle: it.title,
        startMin: it.startMin,
        endMin: it.endMin,
        remaining, 
        total: totalSec, 
        key, 
        endSec, 
        soundStart: s.soundStart || 'success',
        soundEnd: s.soundEnd || 'chime' 
      };
    }
  }
  return null;
}

/**
 * 获取下一个即将执行的任务信息，用于系统托盘显示后续任务
 * @param runningId 当前正在运行的日程ID
 * @param schedules 所有日程列表
 * @param nowSec 当前时间的秒数（从当天0点开始计算）
 * @returns 下一个要执行的任务对象，若没有找到则返回null
 */
export const getNextTask = (runningId: string, schedules: Schedule[], nowSec: number): NextTask | null => {
  if (!runningId) return null;
  const s = schedules.find((x) => x.id === runningId);
  if (!s || !s.items || s.items.length === 0) return null;
  
  // Find tasks that start after nowSec
  const upcoming = s.items
    .filter(it => (it.startMin * 60) > nowSec)
    .sort((a, b) => a.startMin - b.startMin);
    
  if (upcoming.length > 0) {
    const next = upcoming[0];
    return { title: next.title, start: next.start };
  } else {
    // Loop back to the first task
    // Since items are usually sorted by start time, we take the one with min startMin
    const sortedAll = [...s.items].sort((a, b) => a.startMin - b.startMin);
    if (sortedAll.length > 0) {
      const first = sortedAll[0];
      return { title: first.title, start: first.start };
    }
  }
  return null;
}