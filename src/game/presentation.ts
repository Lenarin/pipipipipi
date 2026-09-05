export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`;
}
export function resultContent(mode: string, stage: number) {
  if (mode === 'paused') return { title: 'Пауза', description: 'Конец света подождёт. У него тоже обед с двух до трёх.', resume: true };
  if (mode === 'won') return { title: 'Утро наступило.', description: 'Старший по порту согласовал твой проход. Ты дома. Света нет, зато есть квитанция.', resume: false };
  return { title: 'Не в эту ночь.', description: `Причина смерти: ${['собрание жильцов', 'неудачный разговор с соседями', 'несогласованный проход'][stage] ?? 'городской быт'}. Залог за квартиру, разумеется, не вернут.`, resume: false };
}
