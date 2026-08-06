/**
 * 将秒数格式化为"分钟:秒数"的时间字符串，秒数部分始终保持两位数字
 * @param sec - 要转换的总秒数
 * @returns 格式化后的时间字符串，例如 65秒会转换为"1:05"
 */
export const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}