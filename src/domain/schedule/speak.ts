const CN_DIGITS_SPEAK = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const cnHourSpeak = (h: number): string => {
  if (h === 0) return '零点';
  if (h === 10) return '十点';
  if (h < 10) return CN_DIGITS_SPEAK[h] + '点';
  if (h < 20) return '十' + CN_DIGITS_SPEAK[h - 10] + '点';
  if (h === 20) return '二十点';
  const tens = Math.floor(h / 10);
  const ones = h % 10;
  return CN_DIGITS_SPEAK[tens] + '十' + (ones === 0 ? '点' : CN_DIGITS_SPEAK[ones] + '点');
}

export const cnMinSpeak = (m: number): string => {
  if (m === 0) return '';
  if (m === 10) return '十分';
  if (m < 10) return CN_DIGITS_SPEAK[m] + '分';
  if (m < 20) return '十' + CN_DIGITS_SPEAK[m - 10] + '分';
  const tens = Math.floor(m / 10);
  const ones = m % 10;
  return CN_DIGITS_SPEAK[tens] + '十' + (ones === 0 ? '分' : CN_DIGITS_SPEAK[ones] + '分');
}

export const cnTimeRangeSpeak = (startMin: number, endMin: number): string => {
  const sh = Math.floor(startMin / 60);
  const sm = startMin % 60;
  const eh = Math.floor(endMin / 60);
  const em = endMin % 60;
  const sc = cnHourSpeak(sh) + cnMinSpeak(sm);
  const ec = cnHourSpeak(eh) + cnMinSpeak(em);
  return sc + '到' + ec;
}