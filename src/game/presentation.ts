export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
export function resultContent(mode: string, stage: number) {
  if (mode === 'paused') return { title: 'Пауза', description: 'Пакет подождёт. Продолжим, когда будешь готов.', resume: true };
  if (mode === 'won') return { title: 'Заказ доставлен', description: 'Ларик и Настя делят хачапури. За окном опять колонна, но сейчас обед.', resume: false };
  return { title: 'Доставка задерживается', description: `Маршрут прервался: ${['по дороге в пекарню', 'у аэропорта', 'у дома Насти'][stage] ?? 'в пути'}. Новый забег начинается со звонка.`, resume: false };
}
