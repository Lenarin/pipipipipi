export type StoryId =
  | 'phone-call'
  | 'last-khachapuri'
  | 'wanted'
  | 'airport-chief'
  | 'rough-landing'
  | 'food-threat'
  | 'delivered';

export type BossId = 'mark' | 'chief' | 'miller';
export type SpeakerId = 'larik' | 'nastya' | 'baker' | 'mark' | 'chief' | 'miller';
export type Emotion = 'neutral' | 'warm' | 'intense';

export interface StoryLine {
  speaker: SpeakerId;
  emotion: Emotion;
  text: string;
}

export interface StoryScene {
  id: StoryId;
  title: string;
  lines: readonly StoryLine[];
}

export interface StorySession {
  id: StoryId;
  token: number;
}

export type StoryEffect =
  | { kind: 'resume' }
  | { kind: 'boss'; boss: BossId }
  | { kind: 'stage'; stage: 1 | 2 }
  | { kind: 'victory' };

export interface StoryCharacter {
  id: SpeakerId;
  name: string;
}

const storyIds = Object.freeze([
  'phone-call',
  'last-khachapuri',
  'wanted',
  'airport-chief',
  'rough-landing',
  'food-threat',
  'delivered',
] as const satisfies readonly StoryId[]);

const emotions = new Set<string>(['neutral', 'warm', 'intense']);

export const characters: Readonly<Record<SpeakerId, Readonly<StoryCharacter>>> = Object.freeze({
  larik: Object.freeze({ id: 'larik', name: 'Ларик' }),
  nastya: Object.freeze({ id: 'nastya', name: 'Настя' }),
  baker: Object.freeze({ id: 'baker', name: 'Пекарь' }),
  mark: Object.freeze({ id: 'mark', name: 'Марк' }),
  chief: Object.freeze({ id: 'chief', name: 'Начальник' }),
  miller: Object.freeze({ id: 'miller', name: 'Миллер' }),
});

function line(speaker: SpeakerId, emotion: Emotion, text: string): Readonly<StoryLine> {
  return Object.freeze({ speaker, emotion, text });
}

function scene(id: StoryId, title: string, lines: readonly StoryLine[]): Readonly<StoryScene> {
  return Object.freeze({ id, title, lines: Object.freeze(lines) });
}

export const storyScenes: readonly Readonly<StoryScene>[] = Object.freeze([
  scene('phone-call', 'Звонок', [
    line('nastya', 'intense', 'Ларик, я очень хочу хачапури. Если не поем — убью себя.'),
    line('larik', 'neutral', 'По-аджарски?'),
    line('nastya', 'neutral', 'Да. Здесь вообще не то делают.'),
    line('larik', 'neutral', 'Адрес скинь.'),
    line('nastya', 'neutral', 'Зачем? Я в Америке.'),
    line('larik', 'warm', 'Я помню. Поэтому и спрашиваю.'),
  ]),
  scene('last-khachapuri', 'Последняя порция', [
    line('baker', 'neutral', 'Последний остался. Больше сегодня не будет.'),
    line('mark', 'intense', 'Он мой. Я тут вообще-то инвестор.'),
    line('larik', 'neutral', 'Ты его оплатил?'),
    line('mark', 'intense', 'Я здесь квартиру купил.'),
    line('baker', 'warm', 'У меня касса только за хачапури принимает.'),
    line('larik', 'neutral', 'Тогда я оплачу.'),
    line('mark', 'intense', 'Ты не понимаешь, с кем разговариваешь.'),
    line('larik', 'neutral', 'С человеком перед хачапури.'),
  ]),
  scene('wanted', 'Розыск', [
    line('baker', 'warm', 'Оплата прошла. Держи, горячий.'),
    line('mark', 'intense', 'Алло! Полиция? На инвестора напали!'),
    line('larik', 'neutral', 'Ты первый полез.'),
    line('mark', 'intense', 'У него труба и подозрительный пакет!'),
    line('baker', 'neutral', 'Обычный пакет.'),
    line('larik', 'neutral', 'Где тут в аэропорт?'),
  ]),
  scene('airport-chief', 'Начальник полиции', [
    line('chief', 'intense', 'Положите оружие и пакет на землю.'),
    line('larik', 'neutral', 'Пакет нельзя.'),
    line('chief', 'neutral', 'Почему?'),
    line('larik', 'neutral', 'Остынет.'),
    line('chief', 'intense', 'У вас есть разрешение на вывоз?'),
    line('larik', 'neutral', 'Чек есть.'),
  ]),
  scene('rough-landing', 'Перелёт и крушение', [
    line('nastya', 'intense', 'Ларик, ты куда пропал?'),
    line('larik', 'neutral', 'Еду.'),
    line('nastya', 'intense', 'Почему у тебя всё гремит?'),
    line('larik', 'neutral', 'Уже не еду.'),
  ]),
  scene('food-threat', 'ФБР', [
    line('miller', 'intense', 'ФБР. Отдел пищевых угроз. Что в пакете?'),
    line('larik', 'neutral', 'Хачапури.'),
    line('miller', 'neutral', 'Содержимое.'),
    line('larik', 'neutral', 'Сыр, яйцо, масло.'),
    line('miller', 'intense', 'Три незадекларированных компонента.'),
    line('larik', 'neutral', 'Можно я сначала доставлю?'),
    line('miller', 'intense', 'Вы уже доставили достаточно проблем.'),
  ]),
  scene('delivered', 'Дом Насти', [
    line('nastya', 'intense', 'Ларик? Ты что, прилетел?'),
    line('larik', 'neutral', 'Последние метров триста — уже нет.'),
    line('nastya', 'neutral', 'Я же не всерьёз говорила.'),
    line('larik', 'neutral', 'А я уже купил.'),
    line('nastya', 'warm', 'Будешь половину?'),
    line('larik', 'warm', 'Буду.'),
  ]),
]);

const scenesById = new Map<StoryId, Readonly<StoryScene>>(
  storyScenes.map((storyScene) => [storyScene.id, storyScene]),
);

export function getStoryScene(id: StoryId): Readonly<StoryScene> {
  const found = scenesById.get(id);
  if (!found) throw new Error(`Unknown story scene: ${id}`);
  return found;
}

export function validateStoryData(
  scenes: readonly StoryScene[] = storyScenes,
  roster: Readonly<Partial<Record<SpeakerId, Readonly<StoryCharacter>>>> = characters,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const storyScene of scenes) {
    if (!storyScene.title.trim()) errors.push(`Scene ${storyScene.id} has an empty title.`);
    if (storyScene.lines.length === 0) errors.push(`Scene ${storyScene.id} has no lines.`);
    if (seen.has(storyScene.id)) errors.push(`Duplicate scene id: ${storyScene.id}.`);
    seen.add(storyScene.id);

    storyScene.lines.forEach((storyLine, index) => {
      const location = `Scene ${storyScene.id} line ${index + 1}`;
      if (!roster[storyLine.speaker]) {
        errors.push(`${location} references unknown speaker: ${storyLine.speaker}.`);
      }
      if (!emotions.has(storyLine.emotion)) {
        errors.push(`${location} has invalid emotion: ${storyLine.emotion}.`);
      }
      if (!storyLine.text.trim()) errors.push(`${location} has empty text.`);
    });
  }

  for (const id of storyIds) {
    if (!seen.has(id)) errors.push(`Missing scene: ${id}.`);
  }

  return errors;
}
