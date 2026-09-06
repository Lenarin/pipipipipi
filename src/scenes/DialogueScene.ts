import Phaser from 'phaser';
import { bridge, type DialogueSnapshot, type GameCommand } from '../game/bridge';
import { characters, getStoryScene, type SpeakerId, type StoryScene, type StorySession } from '../story/story';
import { montageKey, portraitFrame } from '../story/dialoguePresentation';

/** Presentation only: the campaign validates the emitted session and applies its effect. */
export class DialogueScene extends Phaser.Scene {
  private session!: StorySession;
  private story!: Readonly<StoryScene>;
  private lineIndex = 0;
  private visibleCharacters = 0;
  private lineMs = 0;
  private elapsed = 0;
  private voiceMs = 0;
  private finished = false;
  private partner: SpeakerId = 'nastya';
  private left!: Phaser.GameObjects.Image;
  private right!: Phaser.GameObjects.Image;
  private montage!: Phaser.GameObjects.Image;
  private voice?: Phaser.Sound.BaseSound;
  private readonly commandHandler = (command: GameCommand) => {
    if (!this.scene.isActive() || this.finished) return;
    if (command === 'dialogue-skip') this.complete();
    if (command === 'dialogue-next') this.next();
  };

  constructor() { super('Dialogue'); }

  create(data: { session: StorySession }): void {
    this.session = data.session;
    this.story = getStoryScene(data.session.id);
    this.lineIndex = 0; this.visibleCharacters = 0; this.lineMs = 0;
    this.elapsed = 0; this.voiceMs = 0; this.finished = false;
    this.partner = this.story.lines.find(line => line.speaker !== 'larik')?.speaker ?? 'nastya';
    this.add.rectangle(320, 180, 640, 360, 0xefe5ce, 0.32);
    this.add.rectangle(320, 294, 632, 124, 0xfff4dc, 0.98).setStrokeStyle(2, 0x277c7b);
    this.left = this.add.image(77, 291, '__WHITE').setDisplaySize(108, 108);
    this.right = this.add.image(563, 291, '__WHITE').setDisplaySize(108, 108);
    this.montage = this.add.image(320, 115, '__WHITE').setDisplaySize(316, 178).setVisible(false);
    if (this.cache.audio.exists('jump')) this.voice = this.sound.add('jump');
    const stopVoice = () => this.voice?.stop();
    this.events.on(Phaser.Scenes.Events.PAUSE, stopVoice);
    bridge.on('command', this.commandHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bridge.off('command', this.commandHandler);
      this.events.off(Phaser.Scenes.Events.PAUSE, stopVoice);
      this.voice?.destroy(); this.voice = undefined;
      bridge.emit('dialogue-state', null);
    });
    this.renderPortraits();
    this.renderMontage();
    this.emitState();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    this.elapsed += delta;
    this.lineMs += delta;
    this.voiceMs += delta;
    const line = this.story.lines[this.lineIndex];
    const count = Math.min(line.text.length, Math.floor(this.lineMs / 26));
    if (count > this.visibleCharacters) {
      this.visibleCharacters = count;
      if (this.voiceMs >= 110 && this.voice) {
        this.voiceMs = 0;
        this.voice.play({ volume: 0.045, rate: line.speaker === 'larik' ? 0.7 : 1.3 });
      }
      this.emitState();
    }
    this.renderPortraits();
    this.renderMontage();
  }

  private renderMontage(): void {
    const key = montageKey(this.session.id, this.elapsed, this.lineIndex);
    if (key && this.textures.exists(key)) this.montage.setTexture(key).setDisplaySize(316, 178).setVisible(true);
  }

  private renderPortraits(): void {
    const line = this.story.lines[this.lineIndex];
    if (line.speaker !== 'larik') this.partner = line.speaker;
    for (const [portrait, speaker] of [[this.left, 'larik'], [this.right, this.partner]] as const) {
      const active = line.speaker === speaker;
      const texture = `portrait-${speaker}`;
      if (this.textures.exists(texture)) portrait.setTexture(texture,
        portraitFrame(active ? line.emotion : 'neutral', active && this.visibleCharacters < line.text.length, active ? this.elapsed : 0));
      portrait.setDisplaySize(108, 108).setAlpha(active ? 1 : 0.62);
    }
  }

  private next(): void {
    const text = this.story.lines[this.lineIndex].text;
    if (this.visibleCharacters < text.length) {
      this.visibleCharacters = text.length;
      this.lineMs = text.length * 26;
    } else if (this.lineIndex < this.story.lines.length - 1) {
      this.lineIndex++; this.visibleCharacters = 0; this.lineMs = 0;
    } else { this.complete(); return; }
    this.renderPortraits();
    this.renderMontage();
    this.emitState();
  }

  private complete(): void {
    if (this.finished) return;
    this.finished = true;
    // Copy before shutdown; listeners may synchronously launch a new session.
    const session = this.session;
    this.scene.stop();
    bridge.emit('dialogue-complete', session);
  }

  private emitState(): void {
    const line = this.story.lines[this.lineIndex];
    const state: DialogueSnapshot = { session: this.session, speaker: line.speaker,
      name: characters[line.speaker].name, fullText: line.text,
      visibleText: line.text.slice(0, this.visibleCharacters), lineIndex: this.lineIndex,
      lineCount: this.story.lines.length, finishedTyping: this.visibleCharacters >= line.text.length };
    bridge.emit('dialogue-state', state);
  }
}
