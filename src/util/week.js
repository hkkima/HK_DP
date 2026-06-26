// Asia/Seoul 기준 ISO 주 키(예 "2026-W26"). 백엔드 index.js 의 seoulWeekKey 와 동일 로직.
//   교환소 곡선은 매주 리셋되므로, 프론트에서 '이번 주 매수 개수'를 올바로 표시하려면
//   저장된 weekKey 가 현재 주와 다르면 weekCount 를 0 으로 간주해야 한다.
export function seoulWeekKey(d = new Date()) {
  const s = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = (s.getDay() + 6) % 7; // 월=0
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - day + 3); // 해당 주 목요일
  const firstThu = new Date(s.getFullYear(), 0, 4);
  const week = 1 + Math.round(((s - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
  return `${s.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
