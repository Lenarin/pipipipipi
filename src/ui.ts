import Phaser from 'phaser';
import { bridge, type GameSnapshot, type GameCommand, type DialogueSnapshot } from './game/bridge';
import { formatTime, resultContent } from './game/presentation';

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export function mountUI(game: Phaser.Game) {
  let mode: GameSnapshot['mode'] = 'title';
  let previousMode: GameSnapshot['mode'] = mode;
  let cacheWasOpen = false;
  let dialogue: DialogueSnapshot | null = null;
  const heldKeys = new Set<string>();
  const blockedKeys = new Set<string>();
  function placeDialogue() {
    const canvas = game.canvas?.getBoundingClientRect();
    if (!canvas?.width) return;
    const shell = byId('game-shell').getBoundingClientRect();
    const panel = byId('dialogue-panel');
    panel.style.left = `${canvas.left - shell.left + canvas.width * 142 / 640}px`;
    panel.style.top = `${canvas.top - shell.top + canvas.height * 240 / 360}px`;
    panel.style.width = `${canvas.width * 356 / 640}px`;
    panel.style.height = `${canvas.height * 107 / 360}px`;
    panel.style.setProperty('--dialogue-font', `${canvas.width * 12 / 640}px`);
  }
  game.scale.on(Phaser.Scale.Events.RESIZE, () => requestAnimationFrame(placeDialogue));
  new ResizeObserver(() => requestAnimationFrame(placeDialogue)).observe(byId('game-shell'));
  let muted = false;
  let shake = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { muted = localStorage.getItem('after-rain-muted') === '1'; } catch { /* Storage is optional. */ }
  game.sound.mute = muted;
  const soundButton = byId<HTMLButtonElement>('sound-button');
  const shakeButton = byId<HTMLButtonElement>('shake-button');
  function reflectSettings() {
    byId('sound-label').textContent = muted ? 'ЗВУК ВЫКЛ.' : 'ЗВУК ВКЛ.';
    soundButton.setAttribute('aria-pressed', String(muted));
    soundButton.setAttribute('aria-label', muted ? 'Включить звук (M)' : 'Выключить звук (M)');
    shakeButton.setAttribute('aria-pressed', String(shake));
    shakeButton.style.opacity = shake ? '1' : '.5';
  }
  function toggleMute() {
    muted = !muted; game.sound.mute = muted; reflectSettings();
    try { localStorage.setItem('after-rain-muted', muted ? '1' : '0'); } catch { /* Private browsing. */ }
  }
  function command(name: GameCommand) {
    bridge.emit('command', name);
    if (['start', 'resume', 'restart'].includes(name)) byId('game-container').focus({ preventScroll: true });
  }
  byId('start-button').addEventListener('click', () => command('start'));
  byId('resume-button').addEventListener('click', () => command('resume'));
  byId('restart-button').addEventListener('click', () => command('restart'));
  byId('pause-button').addEventListener('click', () => command('pause'));
  byId('cache-damage').addEventListener('click', () => command('cache-damage'));
  byId('cache-health').addEventListener('click', () => command('cache-health'));
  byId('cache-cancel').addEventListener('click', () => command('cache-cancel'));
  byId('dialogue-next').addEventListener('click', () => command('dialogue-next'));
  byId('dialogue-skip').addEventListener('click', () => command('dialogue-skip'));
  soundButton.addEventListener('click', toggleMute);
  shakeButton.addEventListener('click', () => { shake = !shake; bridge.emit('command', 'shake'); reflectSettings(); });
  bridge.on('toggle-mute', toggleMute);
  byId('fullscreen-button').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await byId('game-shell').requestFullscreen();
    } catch { byId('toast').textContent = 'Полный экран недоступен в этом браузере'; byId('toast').hidden = false; }
  });
  bridge.on('ready', () => {
    byId<HTMLButtonElement>('start-button').disabled = false;
    byId('start-label').textContent = 'Начать';
    byId('loading-status').textContent = 'ENTER, ЧТОБЫ НАЧАТЬ · НАУШНИКИ РЕКОМЕНДУЮТСЯ';
    if (!shake) bridge.emit('command', 'shake');
  });
  window.addEventListener('keyup', event => { heldKeys.delete(event.code); blockedKeys.delete(event.code); }, true);
  window.addEventListener('blur', () => { heldKeys.forEach(code => blockedKeys.add(code)); heldKeys.clear(); });
  window.addEventListener('keydown', event => {
    // A release outside the window has no keyup here; a fresh press is still valid.
    if (!event.repeat && !heldKeys.has(event.code)) blockedKeys.delete(event.code);
    heldKeys.add(event.code);
    if (mode === 'playing' && blockedKeys.has(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    if (event.code === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) command(cacheWasOpen ? 'cache-cancel' : mode === 'paused' ? 'resume' : 'pause');
      return;
    }
    if (event.code === 'KeyM' && (mode === 'dialogue' || mode === 'paused')) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) toggleMute();
      return;
    }
    if (mode === 'dialogue' && (event.code === 'Enter' || event.code === 'Space')) {
      const focused = document.activeElement;
      if (focused?.tagName === 'BUTTON' && !focused.id.startsWith('dialogue-')) return;
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) command(focused?.id === 'dialogue-skip' ? 'dialogue-skip' : 'dialogue-next');
      return;
    }
    if (event.code === 'Enter' && mode === 'title' && document.activeElement?.tagName !== 'BUTTON') {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat && !byId<HTMLButtonElement>('start-button').disabled) command('start');
    }
    if (byId('cache-choice').hidden) return;
    if (event.code === 'Digit1') { event.preventDefault(); command('cache-damage'); }
    else if (event.code === 'Digit2') { event.preventDefault(); command('cache-health'); }
  }, true);
  bridge.on('dialogue-state', (state: DialogueSnapshot | null) => {
    dialogue = state;
    const panel = byId('dialogue-panel');
    panel.hidden = !state || mode !== 'dialogue';
    if (!state) { if (mode === 'dialogue') byId('game-container').focus({ preventScroll: true }); return; }
    panel.dataset.scene = state.session.id;
    panel.dataset.line = String(state.lineIndex);
    panel.dataset.finishedTyping = String(state.finishedTyping);
    byId('dialogue-speaker').textContent = state.name;
    byId('dialogue-text').textContent = state.visibleText;
    const accessible = `${state.name}: ${state.fullText}`;
    if (byId('dialogue-full-text').textContent !== accessible) byId('dialogue-full-text').textContent = accessible;
    byId('dialogue-position').textContent = `${state.lineIndex + 1} / ${state.lineCount}`;
    placeDialogue();
  });
  bridge.on('state', (state: GameSnapshot) => {
    previousMode = mode; mode = state.mode;
    if (previousMode !== mode) heldKeys.forEach(code => blockedKeys.add(code));
    const inTitle = mode === 'title'; const playing = mode === 'playing'; const inDialogue = mode === 'dialogue';
    byId('hud').hidden = inTitle;
    byId('in-game-bottom').hidden = !playing;
    byId('overlay').hidden = playing || inDialogue;
    byId('dialogue-panel').hidden = !inDialogue || !dialogue;
    byId('title-content').hidden = !inTitle;
    document.querySelector<HTMLElement>('.title-bottom')!.hidden = !inTitle;
    byId('result-content').hidden = inTitle || playing || inDialogue;
    byId('health-label').textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
    byId('health-fill').style.width = `${Math.max(0, state.hp / state.maxHp * 100)}%`;
    const health = document.querySelector<HTMLElement>('.health-track')!;
    health.setAttribute('aria-valuenow', String(state.hp)); health.setAttribute('aria-valuemax', String(state.maxHp));
    byId('health-fill').style.background = state.hp < state.maxHp * .3 ? 'oklch(68% .15 30)' : '';
    byId('flasks').innerHTML = `${'▣ '.repeat(state.flasks)}${'□ '.repeat(Math.max(0, 2 - state.flasks))}<small>АПТЕЧКИ · Q</small>`;
    byId('shards').textContent = `◇ ${state.shards}`;
    byId('chapter-label').textContent = `${String(state.stage + 1).padStart(2, '0')} / ${state.location.toUpperCase()}`;
    byId('objective').textContent = state.objective;
    byId('package-label').hidden = !state.hasPackage;
    const weaponLabel = byId('weapon-label');
    weaponLabel.replaceChildren();
    const weaponName = document.createElement('b');
    weaponName.textContent = 'ТРУБА';
    weaponLabel.append(weaponName, ` · УР. ${state.weaponLevel} · КОМБО 1–1–2`);
    byId('dash-label').textContent = state.dashReady ? 'SHIFT · РЫВОК ГОТОВ' : 'SHIFT · ВОССТАНОВЛЕНИЕ';
    byId('ability-label').textContent = state.abilityReady ? 'F · ПИНОК ГОТОВ' : `F · ПИНОК ${Math.ceil(state.abilityCooldownProgress * 100)}%`;
    byId('heal-label').textContent = state.healing ? `Q · ЛЕЧЕНИЕ ${Math.floor(state.healingProgress * 100)}%` : 'Q · ЛЕЧЕНИЕ 0,75 С';
    byId('run-timer').textContent = formatTime(state.elapsed);
    byId('boss-hud').hidden = !playing || state.bossHp <= 0;
    byId('boss-fill').style.width = `${state.bossMaxHp ? state.bossHp / state.bossMaxHp * 100 : 0}%`;
    byId('boss-health-label').textContent = `${Math.ceil(state.bossHp)} / ${state.bossMaxHp}`;
    byId('boss-name').textContent = state.bossName;
    byId('toast').hidden = !playing || !state.message;
    byId('toast').textContent = state.message;
    const cacheChoice = byId('cache-choice');
    cacheChoice.hidden = !state.cacheChoiceOpen;
    if (state.cacheChoiceOpen && !cacheWasOpen) byId<HTMLButtonElement>('cache-damage').focus({ preventScroll: true });
    cacheWasOpen = state.cacheChoiceOpen;
    if (!playing && !inTitle && !inDialogue) {
      const content = resultContent(mode, state.stage);
      byId('result-title').textContent = content.title;
      byId('result-description').textContent = content.description;
      byId('result-eyebrow').textContent = mode === 'paused' ? 'ПЕРЕРЫВ В ДОСТАВКЕ' : mode === 'won' ? 'ПОКА ГОРЯЧИЙ' : 'ПОПРОБУЕМ ЕЩЁ РАЗ';
      byId('resume-button').hidden = !content.resume;
      byId('restart-button').className = content.resume ? 'secondary-button' : 'primary-button';
      byId('restart-button').textContent = content.resume ? 'НАЧАТЬ ЗАНОВО' : 'НОВАЯ ДОСТАВКА →';
      byId('result-stats').textContent = `${formatTime(state.elapsed)} В ПУТИ     /     ${state.kills} ПРЕПЯТСТВИЙ ПОЗАДИ`;
      if (previousMode !== mode) byId(content.resume ? 'resume-button' : 'restart-button').focus({ preventScroll: true });
    }
  });
  reflectSettings();
}

export function showLoadError(message: string) {
  byId('loading-status').textContent = message;
  byId('start-label').textContent = 'ПОВТОРИТЬ ЗАГРУЗКУ';
  const button = byId<HTMLButtonElement>('start-button');
  button.disabled = false;
  button.addEventListener('click', () => location.reload(), { once: true });
}
