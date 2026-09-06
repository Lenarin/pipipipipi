import { describe, expect, it } from 'vitest';
import { Campaign } from '../src/story/Campaign';
import {
  characters,
  getStoryScene,
  storyScenes,
  validateStoryData,
  type StoryScene,
} from '../src/story/story';

describe('story data', () => {
  it('contains the approved seven scenes and complete dialogue in campaign order', () => {
    expect(storyScenes).toEqual([
      {
        id: 'phone-call',
        title: 'Звонок',
        lines: [
          { speaker: 'nastya', emotion: 'intense', text: 'Ларик, я очень хочу хачапури. Если не поем — убью себя.' },
          { speaker: 'larik', emotion: 'neutral', text: 'По-аджарски?' },
          { speaker: 'nastya', emotion: 'neutral', text: 'Да. Здесь вообще не то делают.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Адрес скинь.' },
          { speaker: 'nastya', emotion: 'neutral', text: 'Зачем? Я в Америке.' },
          { speaker: 'larik', emotion: 'warm', text: 'Я помню. Поэтому и спрашиваю.' },
        ],
      },
      {
        id: 'last-khachapuri',
        title: 'Последняя порция',
        lines: [
          { speaker: 'baker', emotion: 'neutral', text: 'Последний остался. Больше сегодня не будет.' },
          { speaker: 'mark', emotion: 'intense', text: 'Он мой. Я тут вообще-то инвестор.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Ты его оплатил?' },
          { speaker: 'mark', emotion: 'intense', text: 'Я здесь квартиру купил.' },
          { speaker: 'baker', emotion: 'warm', text: 'У меня касса только за хачапури принимает.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Тогда я оплачу.' },
          { speaker: 'mark', emotion: 'intense', text: 'Ты не понимаешь, с кем разговариваешь.' },
          { speaker: 'larik', emotion: 'neutral', text: 'С человеком перед хачапури.' },
        ],
      },
      {
        id: 'wanted',
        title: 'Розыск',
        lines: [
          { speaker: 'baker', emotion: 'warm', text: 'Оплата прошла. Держи, горячий.' },
          { speaker: 'mark', emotion: 'intense', text: 'Алло! Полиция? На инвестора напали!' },
          { speaker: 'larik', emotion: 'neutral', text: 'Ты первый полез.' },
          { speaker: 'mark', emotion: 'intense', text: 'У него труба и подозрительный пакет!' },
          { speaker: 'baker', emotion: 'neutral', text: 'Обычный пакет.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Где тут в аэропорт?' },
        ],
      },
      {
        id: 'airport-chief',
        title: 'Начальник полиции',
        lines: [
          { speaker: 'chief', emotion: 'intense', text: 'Положите оружие и пакет на землю.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Пакет нельзя.' },
          { speaker: 'chief', emotion: 'neutral', text: 'Почему?' },
          { speaker: 'larik', emotion: 'neutral', text: 'Остынет.' },
          { speaker: 'chief', emotion: 'intense', text: 'У вас есть разрешение на вывоз?' },
          { speaker: 'larik', emotion: 'neutral', text: 'Чек есть.' },
        ],
      },
      {
        id: 'rough-landing',
        title: 'Перелёт и крушение',
        lines: [
          { speaker: 'nastya', emotion: 'intense', text: 'Ларик, ты куда пропал?' },
          { speaker: 'larik', emotion: 'neutral', text: 'Еду.' },
          { speaker: 'nastya', emotion: 'intense', text: 'Почему у тебя всё гремит?' },
          { speaker: 'larik', emotion: 'neutral', text: 'Уже не еду.' },
        ],
      },
      {
        id: 'food-threat',
        title: 'ФБР',
        lines: [
          { speaker: 'miller', emotion: 'intense', text: 'ФБР. Отдел пищевых угроз. Что в пакете?' },
          { speaker: 'larik', emotion: 'neutral', text: 'Хачапури.' },
          { speaker: 'miller', emotion: 'neutral', text: 'Содержимое.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Сыр, яйцо, масло.' },
          { speaker: 'miller', emotion: 'intense', text: 'Три незадекларированных компонента.' },
          { speaker: 'larik', emotion: 'neutral', text: 'Можно я сначала доставлю?' },
          { speaker: 'miller', emotion: 'intense', text: 'Вы уже доставили достаточно проблем.' },
        ],
      },
      {
        id: 'delivered',
        title: 'Дом Насти',
        lines: [
          { speaker: 'nastya', emotion: 'intense', text: 'Ларик? Ты что, прилетел?' },
          { speaker: 'larik', emotion: 'neutral', text: 'Последние метров триста — уже нет.' },
          { speaker: 'nastya', emotion: 'neutral', text: 'Я же не всерьёз говорила.' },
          { speaker: 'larik', emotion: 'neutral', text: 'А я уже купил.' },
          { speaker: 'nastya', emotion: 'warm', text: 'Будешь половину?' },
          { speaker: 'larik', emotion: 'warm', text: 'Буду.' },
        ],
      },
    ]);
    expect(getStoryScene('food-threat')).toBe(storyScenes[5]);
  });

  it('defines every speaker and validates the shipped data', () => {
    expect(Object.keys(characters)).toEqual(['larik', 'nastya', 'baker', 'mark', 'chief', 'miller']);
    expect(validateStoryData()).toEqual([]);
  });

  it('reports duplicate scenes, empty content, and invalid speaker references', () => {
    const invalidScenes = [
      { id: 'phone-call', title: '', lines: [] },
      {
        id: 'phone-call',
        title: 'Duplicate',
        lines: [{ speaker: 'ghost', emotion: 'blank', text: '' }],
      },
    ] as unknown as readonly StoryScene[];

    expect(validateStoryData(invalidScenes, characters)).toEqual([
      'Scene phone-call has an empty title.',
      'Scene phone-call has no lines.',
      'Duplicate scene id: phone-call.',
      'Scene phone-call line 1 references unknown speaker: ghost.',
      'Scene phone-call line 1 has invalid emotion: blank.',
      'Scene phone-call line 1 has empty text.',
      'Missing scene: last-khachapuri.',
      'Missing scene: wanted.',
      'Missing scene: airport-chief.',
      'Missing scene: rough-landing.',
      'Missing scene: food-threat.',
      'Missing scene: delivered.',
    ]);
  });

  it('does not expose mutable story collections', () => {
    expect(Object.isFrozen(characters)).toBe(true);
    expect(Object.isFrozen(storyScenes)).toBe(true);
    expect(storyScenes.every((scene) => Object.isFrozen(scene) && Object.isFrozen(scene.lines))).toBe(true);
  });
});

describe('Campaign', () => {
  it('admits only the next scene and makes completion transactional and idempotent', () => {
    const campaign = new Campaign();
    expect(campaign.nextScene).toBe('phone-call');
    expect(campaign.begin('wanted')).toBeNull();

    const call = campaign.begin('phone-call')!;
    expect(campaign.begin('phone-call')).toBeNull();
    expect(campaign.complete({ ...call, token: call.token + 1 })).toBeNull();
    expect(campaign.current).toEqual(call);
    expect(campaign.complete(call)).toEqual({ kind: 'resume' });
    expect(campaign.complete(call)).toBeNull();
    expect(campaign.nextScene).toBe('last-khachapuri');
  });

  it('invalidates an open session on reset without reusing its token', () => {
    const campaign = new Campaign();
    const stale = campaign.begin('phone-call')!;

    campaign.reset();
    const current = campaign.begin('phone-call')!;

    expect(current.token).not.toBe(stale.token);
    expect(campaign.complete(stale)).toBeNull();
    expect(campaign.current).toEqual(current);
    expect(campaign.snapshot()).toEqual({
      stage: 0,
      hasPackage: false,
      wanted: false,
      delivered: false,
      current,
      nextScene: 'phone-call',
      completedScenes: [],
      defeatedBosses: [],
      activeBoss: null,
    });
  });

  it('requires each introduced boss to be defeated before its exit scene', () => {
    const campaign = new Campaign();
    finish(campaign, 'phone-call');
    expect(campaign.defeatBoss('mark')).toBe(false);

    expect(finish(campaign, 'last-khachapuri')).toEqual({ kind: 'boss', boss: 'mark' });
    expect(campaign.begin('wanted')).toBeNull();
    expect(campaign.defeatBoss('chief')).toBe(false);
    expect(campaign.defeatBoss('mark')).toBe(true);
    expect(campaign.defeatBoss('mark')).toBe(false);
    expect(campaign.begin('wanted')).not.toBeNull();
  });

  it('commits all seven completion effects and state changes only on completion', () => {
    const campaign = new Campaign();
    const call = campaign.begin('phone-call')!;
    expect(campaign.snapshot().completedScenes).toEqual([]);
    expect(campaign.complete(call)).toEqual({ kind: 'resume' });

    expect(finish(campaign, 'last-khachapuri')).toEqual({ kind: 'boss', boss: 'mark' });
    campaign.defeatBoss('mark');
    const wanted = campaign.begin('wanted')!;
    expect({ stage: campaign.stage, hasPackage: campaign.hasPackage, wanted: campaign.wanted }).toEqual({ stage: 0, hasPackage: false, wanted: false });
    expect(campaign.complete(wanted)).toEqual({ kind: 'stage', stage: 1 });
    expect({ stage: campaign.stage, hasPackage: campaign.hasPackage, wanted: campaign.wanted }).toEqual({ stage: 1, hasPackage: true, wanted: true });

    expect(finish(campaign, 'airport-chief')).toEqual({ kind: 'boss', boss: 'chief' });
    campaign.defeatBoss('chief');
    expect(finish(campaign, 'rough-landing')).toEqual({ kind: 'stage', stage: 2 });
    expect(campaign.stage).toBe(2);

    expect(finish(campaign, 'food-threat')).toEqual({ kind: 'boss', boss: 'miller' });
    campaign.defeatBoss('miller');
    const delivered = campaign.begin('delivered')!;
    expect(campaign.delivered).toBe(false);
    expect(campaign.complete(delivered)).toEqual({ kind: 'victory' });
    expect(campaign.delivered).toBe(true);
    expect(campaign.nextScene).toBeNull();
  });

  it('resets every campaign flag while preserving token freshness', () => {
    const campaign = completedCampaign();
    const previousToken = campaign.snapshot().current?.token ?? -1;

    campaign.reset();

    expect(campaign.snapshot()).toEqual({
      stage: 0,
      hasPackage: false,
      wanted: false,
      delivered: false,
      current: null,
      nextScene: 'phone-call',
      completedScenes: [],
      defeatedBosses: [],
      activeBoss: null,
    });
    expect(campaign.begin('phone-call')!.token).toBeGreaterThan(previousToken);
  });
});

function finish(campaign: Campaign, id: Parameters<Campaign['begin']>[0]) {
  const session = campaign.begin(id);
  expect(session).not.toBeNull();
  return campaign.complete(session!);
}

function completedCampaign(): Campaign {
  const campaign = new Campaign();
  finish(campaign, 'phone-call');
  finish(campaign, 'last-khachapuri');
  campaign.defeatBoss('mark');
  finish(campaign, 'wanted');
  finish(campaign, 'airport-chief');
  campaign.defeatBoss('chief');
  finish(campaign, 'rough-landing');
  finish(campaign, 'food-threat');
  campaign.defeatBoss('miller');
  finish(campaign, 'delivered');
  return campaign;
}
