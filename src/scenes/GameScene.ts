import Phaser from 'phaser';
import { bridge, type GameCommand, type GameSnapshot } from '../game/bridge';
import { decorateLevel, drawPlatform } from '../game/art';
import { CombatAudio } from '../game/CombatAudio';
import { CombatEffects } from '../game/CombatEffects';
import { EnemyAttackPresentation } from '../game/EnemyAttackPresentation';
import { DefeatEffects } from '../game/DefeatEffects';
import { GroundEffects } from '../game/GroundEffects';
import { KickAction } from '../gameplay/ActionState';
import { AttackChain } from '../gameplay/Combat';
import { Enemy, type EnemyEvent } from '../gameplay/Enemy';
import { Player } from '../gameplay/Player';
import { RunRules } from '../gameplay/Rules';
import { levels, type CacheData, type LevelData } from '../levels';
import { Campaign } from '../story/Campaign';
import type { StoryId, StorySession } from '../story/story';

type CacheVisual = { id: string; data: CacheData; marker: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image; used: boolean };
type ProjectileAttackToken = { consumed: boolean };

/** The Phaser orchestration layer: input, Arcade collisions, effects, audio and bridge state. */
export class GameScene extends Phaser.Scene {
  readonly rules = new RunRules();
  readonly campaign = new Campaign();
  player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private level!: LevelData;
  private gate!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  private caches: CacheVisual[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'left' | 'right' | 'jump' | 'jumpAlt' | 'attack' | 'dash' | 'dashAlt' | 'heal' | 'ability' | 'interact' | 'pause', Phaser.Input.Keyboard.Key>;
  private snapshotMs = 0;
  private readonly pressedActions = new Set<string>();
  private readonly pressHandler = (event: KeyboardEvent) => {
    if (!event.repeat && this.rules.mode === 'playing' && !this.rules.cacheChoiceOpen) this.pressedActions.add(event.code);
  };
  private readonly attack = new AttackChain();
  private readonly kick = new KickAction(160);
  private activeSwing: number | null = null;
  private combatEffects!: CombatEffects;
  private defeatEffects!: DefeatEffects;
  private combatAudio!: CombatAudio;
  private groundEffects!: GroundEffects;
  private readonly enemyPresentations = new Map<string, EnemyAttackPresentation>();
  private hitStopActive = false;
  private stoppedSwing: number | null = null;
  private hitStopTimer?: Phaser.Time.TimerEvent;
  private bossActivated = false;
  private dashBufferMs = 0;
  private jumpBufferMs = 0;
  private message = 'Нажмите «Начать»';
  private messageUntil = Number.POSITIVE_INFINITY;
  private shakeEnabled = true;
  private interactPrompt!: Phaser.GameObjects.Text;
  private ambience?: Phaser.Sound.BaseSound;
  private ambienceVolume = 0.16;
  private readonly dialogueCompleteHandler = (session: StorySession) => this.completeDialogue(session);
  private readonly commandHandler = (command: GameCommand) => this.handleCommand(command);
  private readonly focusHandler = () => this.pauseForFocusLoss();
  private readonly visibilityHandler = () => { if (document.hidden) this.pauseForFocusLoss(); };
  private readonly muteHandler = () => bridge.emit('toggle-mute');
  private readonly pointerHandler = (pointer: Phaser.Input.Pointer) => {
    if (this.rules.mode === 'playing' && !this.rules.cacheChoiceOpen && pointer.leftButtonDown()) {
      this.rules.cancelHealing();
      this.queueAttack(this.movementIntent());
    }
  };

  constructor() { super('Game'); }

  create(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      left: 'A', right: 'D', jump: 'SPACE', jumpAlt: 'W', attack: 'J', dash: 'SHIFT', dashAlt: 'K', heal: 'Q', ability: 'F', interact: 'E', pause: 'ESC',
    }) as GameScene['keys'];
    this.buildStage(0);
    this.physics.pause();
    bridge.on('command', this.commandHandler);
    bridge.on('dialogue-complete', this.dialogueCompleteHandler);
    this.input.keyboard!.on('keydown', this.pressHandler);
    this.input.keyboard!.on('keydown-M', this.muteHandler);
    this.input.on('pointerdown', this.pointerHandler);
    window.addEventListener('blur', this.focusHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanUp, this);
    bridge.emit('ready');
    this.emitState();
  }

  update(_time: number, rawDelta: number): void {
    if (this.rules.mode !== 'playing' || this.rules.cacheChoiceOpen) {
      this.cameras.main.setLerp(0, 0);
      return;
    }
    const movementFacing = this.movementIntent();
    const attackPressed = this.consumePress('KeyJ');
    const jumpPressedNow = this.consumePress('ArrowUp', 'Space', 'KeyW');
    const dashPressedNow = this.consumePress('ShiftLeft', 'ShiftRight', 'KeyK');
    const healPressed = this.consumePress('KeyQ');
    const abilityPressed = this.consumePress('KeyF');
    const movementHeld = Boolean(movementFacing);
    if (healPressed) this.tryHeal();
    if (movementHeld || attackPressed || dashPressedNow || jumpPressedNow || abilityPressed) this.cancelHealing();
    if (abilityPressed) this.tryKick();
    if (attackPressed) this.queueAttack(movementFacing);
    if (jumpPressedNow) this.jumpBufferMs = 120;
    if (dashPressedNow) this.dashBufferMs = 130;
    const dashDuringHitStop = this.hitStopActive && this.dashBufferMs > 0 && this.rules.dashReady && !this.kick.active;
    if (this.hitStopActive && !dashDuringHitStop) return;
    if (dashDuringHitStop) {
      this.cancelHitStop();
      this.physics.resume();
      this.tweens.resumeAll();
      this.resumeActorAnimations();
    }
    const delta = Math.min(Math.max(rawDelta, 0), 50);
    // Phaser owns following; a time-based coefficient avoids display-rate-dependent lag.
    this.cameras.main.setLerp(1 - Math.exp(-delta / 55), 0);
    this.rules.tick(delta);
    const dashReady = this.dashBufferMs > 0 && !this.kick.active && this.rules.useCooldown('dash', 750);
    if (dashReady) { this.dashBufferMs = 0; this.cancelAttack(); }
    else this.dashBufferMs = Math.max(0, this.dashBufferMs - delta);
    const attackEvents = this.attack.advance(delta, movementFacing);
    const bufferedJump = this.jumpBufferMs > 0;
    this.jumpBufferMs = 0;
    const step = this.player.updateMovement({
      left: this.cursors.left.isDown || this.keys.left.isDown,
      right: this.cursors.right.isDown || this.keys.right.isDown,
      jumpPressed: bufferedJump,
      jumpHeld: this.cursors.up.isDown || this.keys.jump.isDown || this.keys.jumpAlt.isDown,
      dashPressed: dashReady,
    }, delta, true, { ...this.attack.state, progress: this.attack.phaseProgress });
    this.limitAttackAdvance(delta);
    this.groundEffects.update(this.player, this.level, this.attack.state.phase === 'idle' && !this.kick.active && !this.rules.healing);
    if (step.jumped) this.playSound('jump');
    if (step.dashed) { this.rules.grantImmunity(190); this.combatEffects.dashBurst(this.player.x, this.player.y, this.player.facing); this.playSound('dash'); }
    if (step.dashEnded) this.combatEffects.dashBurst(this.player.x, this.player.y, this.player.facing, true);
    // Resolve the active portion of a tick that crosses into recovery. Otherwise
    // its final authored contact disappears at low/uneven frame rates.
    const finishingContact = attackEvents.some(event => event.type === 'recovery');
    this.combatEffects.update(this.player, finishingContact ? { ...this.attack.state, phase: 'active' } : this.attack.state,
      finishingContact ? 1 : this.attack.phaseProgress, this.attack.currentProfile, delta);
    this.resolveAttackEvents(attackEvents);
    this.resolveActiveAttack(finishingContact);
    if (finishingContact) this.combatEffects.update(this.player, this.attack.state, this.attack.phaseProgress, this.attack.currentProfile, 0);
    this.combatEffects.updateKick(this.player, this.kick);
    this.resolveKick();
    this.kick.advance(delta);
    this.combatEffects.updateHealing(this.player, this.rules.healing, this.rules.healingProgress);
    if (this.rules.advanceHealing(delta)) this.completeHeal();
    if (this.consumePress('KeyE')) this.interact();
    if (this.rules.mode !== 'playing' || this.rules.cacheChoiceOpen) return;
    const bossAllowed = this.bossActivated;
    let occupiedAttackSlots = this.enemies.getChildren().filter((child) => (child as Enemy).isAttacking).length;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      if (enemy.kind === 'boss' && bossAllowed) enemy.activate();
      const wasAttacking = enemy.isAttacking;
      const inView = this.cameras.main.worldView.contains(enemy.x, enemy.y);
      const events = enemy.updateAi(this.player, delta, bossAllowed, inView && (wasAttacking || occupiedAttackSlots < 1));
      if (!wasAttacking && enemy.isAttacking) occupiedAttackSlots++;
      this.enemyPresentations.get(enemy.id)?.update(enemy);
      this.updateEnemyHealthBar(enemy);
      for (const event of events) this.resolveEnemyEvent(event);
      this.resolveEnemyActive(enemy);
    }
    this.player.setAlpha(this.player.isDashing ? 0.72 : this.rules.immune ? 0.62 + Math.sin(this.rules.elapsed / 38) * 0.13 : 1);
    this.projectiles.getChildren().forEach((child) => {
      const projectile = child as Phaser.Physics.Arcade.Image;
      if (projectile.x < 0 || projectile.x > this.level.width || projectile.y > 390) projectile.destroy();
    });
    this.updateInteractPrompt();
    this.cameras.main.scrollY = 30;
    this.snapshotMs += delta;
    if (this.snapshotMs >= 100) { this.snapshotMs = 0; this.emitState(); }
  }

  private buildStage(index: number): void {
    this.cancelPlayerActions();
    this.cancelHitStop();
    this.bossActivated = false;
    this.cameras.main.resetFX();
    this.level = levels[index];
    this.cameras.main.setBounds(0, 0, this.level.width, 360);
    this.cameras.main.setZoom(this.rules.mode === 'title' ? 1 : 1.2);
    this.physics.world.setBounds(0, 0, this.level.width, 380);
    this.physics.world.colliders.destroy();
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.platforms?.destroy(true, true);
    this.enemies?.destroy(true, true);
    this.projectiles?.destroy(true, true);
    this.combatEffects?.destroy();
    this.groundEffects?.destroy();
    this.defeatEffects?.destroy();
    this.enemyPresentations.forEach((presentation) => presentation.destroy());
    this.enemyPresentations.clear();
    // DisplayList.removeAll(true) only detaches and skips callbacks; it does not destroy.
    // Destroy a stable copy so text canvases, native rain emitters and update entries are released.
    for (const child of [...this.children.getChildren()]) child.destroy();
    decorateLevel(this, index, this.level.width);
    this.platforms = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.addPlatform(this.level.width / 2, 334, this.level.width, 44);
    this.level.platforms.forEach((platform) => this.addPlatform(platform.x, platform.y, platform.width, platform.height ?? 18, true));
    this.player = new Player(this, 110, 265);
    this.combatEffects = new CombatEffects(this);
    this.defeatEffects = new DefeatEffects(this, this.level);
    this.combatAudio = new CombatAudio(this);
    this.groundEffects = new GroundEffects(this);
    this.player.play('hero-idle');
    if (this.rules.mode === 'title') {
      this.player.setPosition(485, 267).setScale(95 / 80);
      this.cameras.main.stopFollow();
      this.cameras.main.setScroll(0, 0);
    } else {
      this.cameras.main.startFollow(this.player, true, 0.26, 0);
      this.cameras.main.setScroll(0, 30);
      this.cameras.main.setDeadzone(120, 0);
    }
    for (const spawn of this.level.enemies) {
      const enemy = new Enemy(this, spawn.id, spawn.kind, spawn.x, spawn.y ?? (spawn.kind === 'hound' ? 291 : spawn.kind === 'boss' ? 260 : 276), { bossId: spawn.bossId, faction: spawn.faction ?? (['street', 'police', 'federal'] as const)[index] });
      if (this.rules.mode === 'title') enemy.setVisible(false);
      this.enemies.add(enemy);
      this.enemyPresentations.set(enemy.id, new EnemyAttackPresentation(this));
    }
    this.caches = this.level.caches.map((data, cacheIndex) => ({ id: `${index}-${cacheIndex}`, data, used: false, marker: this.textures.exists(data.upgrade === 'health' ? 'cache-health' : 'cache-damage')
      ? this.add.image(data.x, data.y, data.upgrade === 'health' ? 'cache-health' : 'cache-damage').setDepth(3)
      : this.add.rectangle(data.x, data.y, 20, 25, 0x8eb8b2, 0.95).setDepth(3) }));
    this.gate = this.textures.exists('exit-gate') ? this.add.image(this.level.exitX, 270, 'exit-gate').setDepth(3) : this.add.rectangle(this.level.exitX, 270, 24, 82, 0xb8d0d3, 0.85).setDepth(3);
    this.combatEffects.update(this.player, this.attack.state, this.attack.phaseProgress);
    this.interactPrompt = this.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '11px', color: '#f5e4b7', stroke: '#14242d', strokeThickness: 3 }).setOrigin(0.5).setDepth(16).setVisible(false);
    this.physics.add.collider(this.player, this.platforms, undefined, (_player, platform) => this.canLandOnPlatform(platform as Phaser.Physics.Arcade.Image));
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.projectiles, this.platforms, (object) => object.destroy());
    this.physics.add.overlap(this.player, this.projectiles, (_player, projectile) => this.hitFromProjectile(projectile as Phaser.Physics.Arcade.Image));
    this.setMessage(this.rules.mode === 'title' ? 'Нажмите «Начать»' : this.routeObjective());
    if (this.rules.mode === 'playing') {
      this.time.paused = false;
      this.tweens.resumeAll();
      this.physics.resume();
      this.resumeActorAnimations();
    }
  }

  private consumePress(...codes: string[]): boolean {
    let pressed = false;
    for (const code of codes) if (this.pressedActions.delete(code)) pressed = true;
    return pressed;
  }

  /** Restrict only the attack's forward step, not walking or a dodge through enemies. */
  private limitAttackAdvance(delta: number): void {
    if (this.attack.state.phase === 'idle' || this.player.isDashing) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body, facing = this.attack.state.facing;
    if (body.velocity.x * facing <= 0) return;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy, target = enemy.body as Phaser.Physics.Arcade.Body;
      const gap = (enemy.x - this.player.x) * facing;
      if (!enemy.active || enemy.defeated || gap <= 0 || body.bottom < target.top || body.top > target.bottom) continue;
      const spacing = (body.width + target.width) / 2 + 4;
      const speed = Math.max(0, gap - spacing) / (Math.max(delta, 1000 / this.physics.world.fps) / 1000);
      if (speed < body.velocity.x * facing) body.setVelocityX(facing * speed);
    }
  }

  private addPlatform(x: number, y: number, width: number, height: number, oneWay = false): void {
    drawPlatform(this, x, y, width, height);
    const body = this.physics.add.staticImage(x, y, 'platform').setDisplaySize(width, height).setVisible(false);
    body.setData('oneWay', oneWay);
    body.refreshBody();
    this.platforms.add(body);
  }

  private queueAttack(intent = this.movementIntent()): void {
    if (this.kick.active || this.player.isDashing || this.player.isHurt) return;
    const wasIdle = this.attack.state.phase === 'idle';
    if (!this.attack.request(intent ?? this.player.facing)) return;
    if (wasIdle) this.player.beginAttack();
  }

  private cancelAttack(): void {
    this.attack.cancel();
    this.activeSwing = null;
    this.stoppedSwing = null;
    this.combatEffects?.clear();
  }

  private resolveAttackEvents(events: ReturnType<AttackChain['advance']>): void {
    for (const event of events) {
      if (event.type === 'active') { this.activeSwing = this.rules.beginSwing(); this.combatAudio.swing(event.step); }
      else if (event.type === 'idle') this.activeSwing = null;
    }
  }

  /** Intersect live Arcade bodies with the same rendered blade segment used for feedback. */
  private resolveActiveAttack(finishingContact = false): void {
    const activeInterval = this.attack.state.phase === 'active' || (finishingContact && this.attack.state.phase === 'recovery');
    if (!activeInterval || this.activeSwing === null || !this.attack.currentProfile) return;
    const { facing } = this.attack.state;
    const { damageMultiplier } = this.attack.currentProfile;
    const strikes = this.combatEffects.strikeSweep;
    if (strikes.length === 0) return;
    const damage = Math.round(this.rules.damage * damageMultiplier);
    for (const child of [...this.enemies.getChildren()]) {
      const enemy = child as Enemy;
      if (enemy.kind === 'boss' && !this.bossActivated) continue;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const point = this.combatEffects.strikeContact(new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height));
      if (!point) continue;
      if (!this.rules.hitTarget(this.activeSwing, enemy.id)) continue;
      const blocked = enemy.isBlocking && facing === -enemy.attackFacing;
      if (enemy.receiveHit(damage, facing, this.attack.state.step === 3)) {
        const x = Phaser.Math.Clamp(point.x, body.x, body.right), y = Phaser.Math.Clamp(point.y, body.y, body.bottom);
        this.combatEffects.confirmHit(x, y, damage, this.attack.state.step === 3, facing, this.shakeEnabled);
        if (this.stoppedSwing !== this.activeSwing) {
          this.stoppedSwing = this.activeSwing;
          this.combatAudio.impact(this.attack.state.step);
          this.beginHitStop([50, 55, 85][this.attack.state.step - 1]);
        }
        this.resolveBossReinforcements(enemy);
        this.damageEnemy(enemy, damage);
      } else if (blocked) {
        this.enemyPresentations.get(enemy.id)?.showBlock(enemy);
        if (this.cache.audio.exists('dash')) this.sound.play('dash', { volume: 0.24, rate: 0.62 });
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number): void {
    if (!enemy.active || !enemy.defeated) return;
    if (enemy.bossId) this.campaign.defeatBoss(enemy.bossId);
    this.defeatEffects.show(enemy, this.hitStopActive);
    this.rules.recordKill(enemy.kind === 'boss' ? 20 : 3);
    this.combatAudio.kill();
    this.enemyPresentations.get(enemy.id)?.destroy();
    this.enemyPresentations.delete(enemy.id);
    const healthBar = enemy.getData('healthBar') as Phaser.GameObjects.Graphics | undefined;
    healthBar?.destroy();
    enemy.destroy();
    this.setMessage(this.enemies.countActive(true) === 0 ? 'Путь открыт — E у выхода' : `${enemy.displayName}: дело закрыто`);
  }

  private resolveEnemyEvent(event: EnemyEvent): void {
    if (event.type !== 'active') return;
    const { enemy, attack, facing } = event;
    if (!enemy.active) return;
    if (attack === 'projectile' || attack === 'boss-volley' || attack === 'miller-volley') {
      const heavy = attack === 'boss-volley' || attack === 'miller-volley';
      const count = heavy ? 3 : 1;
      const hitToken: ProjectileAttackToken = { consumed: false };
      for (let index = 0; index < count; index++) this.fireProjectile(enemy, index - (count - 1) / 2, heavy, facing, hitToken, attack === 'miller-volley' ? enemy.aimTarget : undefined);
    }
  }

  private resolveEnemyActive(enemy: Enemy): void {
    const profile = enemy.attackProfile;
    const shape = enemy.attackShape;
    if (enemy.state !== 'active' || !enemy.attackHitAvailable || !profile || !shape || profile.motion === 'cast') return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBounds = new Phaser.Geom.Rectangle(playerBody.x, playerBody.y, playerBody.width, playerBody.height);
    const attackBounds = new Phaser.Geom.Rectangle(shape.x, shape.y, shape.width, shape.height);
    if (!Phaser.Geom.Intersects.RectangleToRectangle(attackBounds, playerBounds)) return;
    if (this.rules.takeDamage(profile.damage)) {
      enemy.consumeAttackHit();
      this.onPlayerHurt();
    }
  }

  private resolveBossReinforcements(enemy: Enemy): void {
    if (!enemy.consumeReinforcements()) return;
    const positions = [
      { id: 'miller-agent-1', kind: 'walker' as const, x: enemy.x - 150 },
      { id: 'miller-agent-2', kind: 'spitter' as const, x: enemy.x + 150 },
    ];
    for (const reinforcement of positions) {
      const helper = new Enemy(this, reinforcement.id, reinforcement.kind, Phaser.Math.Clamp(reinforcement.x, 70, this.level.width - 70), 276, { faction: 'federal' });
      helper.activate();
      this.enemies.add(helper);
      this.enemyPresentations.set(helper.id, new EnemyAttackPresentation(this));
    }
  }

  private fireProjectile(enemy: Enemy, spread: number, heavy: boolean, facing: 1 | -1, hitToken: ProjectileAttackToken, aimTarget?: Readonly<{ x: number; y: number }>): void {
    const shot = this.physics.add.image(enemy.x, enemy.y - 5, 'projectile');
    this.projectiles.add(shot);
    shot.setData('damage', enemy.attackProfile?.damage ?? (heavy ? 18 : 12));
    shot.setData('attackHitToken', hitToken);
    if (aimTarget) {
      const angle = Math.atan2(aimTarget.y - (enemy.y - 5), aimTarget.x - enemy.x) + spread * 0.11;
      shot.setVelocity(Math.cos(angle) * 260, Math.sin(angle) * 260);
    } else shot.setVelocity(facing * (heavy ? 245 : 230), spread * 75);
    shot.setDepth(6);
  }

  private hitFromProjectile(projectile: Phaser.Physics.Arcade.Image): void {
    if (!projectile.active) return;
    const hitToken = projectile.getData('attackHitToken') as ProjectileAttackToken | undefined;
    if (!hitToken?.consumed && this.rules.takeDamage(Number(projectile.getData('damage')) || 12)) {
      if (hitToken) hitToken.consumed = true;
      this.onPlayerHurt();
    }
    projectile.destroy();
  }

  private canLandOnPlatform(platform: Phaser.Physics.Arcade.Image): boolean {
    if (!platform.getData('oneWay')) return true;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
    return playerBody.velocity.y >= 0 && playerBody.bottom <= platformBody.top + 8;
  }

  private onPlayerHurt(): void {
    this.cancelPlayerActions();
    this.player.showHurt();
    this.playSound('hit');
    if (this.shakeEnabled) this.cameras.main.shake(85, 0.004);
    this.player.setTint(0xff8f8f);
    this.time.delayedCall(130, () => this.player?.active && this.player.clearTint());
    if (this.rules.mode === 'dead') this.onDeath();
  }

  private beginHitStop(durationMs: number): void {
    if (this.rules.mode !== 'playing') return;
    this.hitStopTimer?.remove(false);
    this.hitStopActive = true;
    this.cameras.main.setLerp(0, 0);
    this.physics.pause();
    this.tweens.pauseAll();
    this.pauseActorAnimations();
    this.hitStopTimer = this.time.delayedCall(durationMs, () => {
      this.hitStopTimer = undefined;
      if (!this.hitStopActive || this.rules.mode !== 'playing') return;
      this.hitStopActive = false;
      this.physics.resume();
      this.tweens.resumeAll();
      this.resumeActorAnimations();
    });
  }

  private cancelHitStop(): void {
    this.hitStopTimer?.remove(false);
    this.hitStopTimer = undefined;
    this.hitStopActive = false;
  }

  private tryHeal(): void {
    if (this.attack.state.phase !== 'idle' || this.player.isDashing || this.kick.active || Boolean(this.movementIntent())) return;
    if (!this.rules.beginHealing()) return;
    this.setMessage('Лечение: стойте спокойно 0,75 сек. Любое действие прервёт канал.');
  }

  private completeHeal(): void {
    this.playSound('heal');
    this.floatingText(this.player.x, this.player.y - 34, '+35', '#b7f0c2');
    this.setMessage('Фляга восстановила силы. Бюрократия организма удовлетворена.');
  }

  private cancelHealing(): void {
    if (this.rules.cancelHealing()) this.setMessage('Лечение прервано, фляга не потрачена', 1200);
  }

  private tryKick(): void {
    if (this.player.isDashing || this.player.isHurt) return;
    if (!this.rules.useAbility()) { this.setMessage('Пинок ещё на согласовании', 900); return; }
    this.cancelAttack();
    this.kick.begin(this.player.facing);
    this.playSound('dash');
  }

  private resolveKick(): void {
    const bounds = this.combatEffects.kickBounds;
    if (!this.kick.active || !bounds) return;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Enemy;
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const target = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (!Phaser.Geom.Intersects.RectangleToRectangle(bounds, target) || !this.kick.hit(enemy.id)) continue;
      if (enemy.receiveKick(this.kick.facing)) {
        this.combatEffects.confirmHit(enemy.x, enemy.y, 0, false, this.kick.facing, false);
        this.setMessage(`${enemy.displayName}: возражение принято ногой`, 1100);
      } else if (enemy.kind === 'boss') this.setMessage('Начальство пинком не прерывается', 1100);
    }
  }

  private interact(): void {
    if (this.rules.mode !== 'playing' || this.rules.cacheChoiceOpen) return;
    const cache = this.caches.find((item) => !item.used && Phaser.Math.Distance.Between(this.player.x, this.player.y, item.data.x, item.data.y) < 48);
    if (cache) {
      this.openCacheChoice(cache);
      return;
    }
    if (this.campaign.nextScene === this.level.introScene && Math.abs(this.player.x - this.level.bossIntroX) <= 55) {
      if (this.routeEnemiesRemain()) this.setMessage('Сначала расчистите путь к арене');
      else this.beginDialogue(this.level.introScene);
      return;
    }
    if (Math.abs(this.player.x - this.level.exitX) > 55) return;
    if (this.enemies.countActive(true) > 0) { this.setMessage('Путь закрыт: рядом ещё противники'); return; }
    this.beginDialogue(this.level.exitScene);
  }

  private routeEnemiesRemain(): boolean {
    return this.enemies.getChildren().some(child => (child as Enemy).kind !== 'boss' && child.active);
  }

  private routeObjective(): string {
    return ['Доберись до пекарни', 'Доберись до аэропорта', 'Доберись до дома Насти'][this.rules.stage];
  }

  private freezeWorld(): void {
    this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true;
    this.pauseActorAnimations(); this.clearInput();
    // Pause the native scene as well: particles and every UpdateList child stop with it.
    this.scene.pause('Game');
  }

  private resumeWorld(): void {
    this.scene.resume('Game');
    this.time.paused = false; this.tweens.resumeAll(); this.physics.resume();
    this.resumeActorAnimations(); this.clearInput();
  }

  private beginDialogue(id: StoryId): void {
    if (this.rules.mode !== 'playing' || this.rules.cacheChoiceOpen) return;
    const session = this.campaign.begin(id);
    if (!session || !this.rules.beginDialogue()) return;
    this.cancelPlayerActions(); this.cancelHitStop();
    this.freezeWorld();
    const music = this.ambience as (Phaser.Sound.WebAudioSound & { config: Phaser.Types.Sound.SoundConfig }) | undefined;
    // The AudioParam getter can still report its default while the audio context unlocks.
    if (music) { this.ambienceVolume = music.config.volume ?? 0.16; music.setVolume(this.ambienceVolume * 0.3); }
    this.emitState();
    this.scene.launch('Dialogue', { session });
  }

  private completeDialogue(session: StorySession): void {
    if (this.rules.mode !== 'dialogue') return;
    const effect = this.campaign.complete(session);
    if (!effect) return;
    this.rules.endDialogue();
    this.cancelPlayerActions(); this.cancelEnemyActions(); this.cancelHitStop();
    this.projectiles.clear(true, true);
    (this.ambience as Phaser.Sound.WebAudioSound | undefined)?.setVolume(this.ambienceVolume);
    this.resumeWorld();
    if (effect.kind === 'boss') {
      this.bossActivated = true;
      this.enemies.getChildren().forEach(child => {
        const enemy = child as Enemy;
        if (enemy.bossId === effect.boss) enemy.activate();
      });
    } else if (effect.kind === 'stage') {
      this.rules.stage = effect.stage;
      this.buildStage(effect.stage);
    } else if (effect.kind === 'victory') {
      this.rules.mode = 'won'; this.onVictory(); return;
    }
    this.setMessage(this.routeObjective());
    this.emitState();
  }

  private openCacheChoice(cache: CacheVisual): void {
    if (!this.rules.openCacheChoice(cache.id)) return;
    this.cancelPlayerActions();
    this.physics.pause();
    this.tweens.pauseAll();
    this.time.paused = true;
    this.pauseActorAnimations();
    this.clearInput();
    this.emitState();
  }

  private closeCacheChoice(choice?: 'damage' | 'health'): void {
    const openId = this.caches.find((cache) => cache.id === this.rules.openCacheId);
    const applied = choice ? this.rules.applyCacheChoice(choice) : this.rules.cancelCacheChoice();
    if (!applied) return;
    if (choice && openId) {
      openId.used = true;
      if (openId.marker instanceof Phaser.GameObjects.Rectangle) openId.marker.setFillStyle(0x52696b, 0.45);
      else openId.marker.setTint(0x52696b).setAlpha(0.45);
      this.setMessage(choice === 'health' ? 'Тайник: санаторная льгота, здоровье +20 и фляга +1' : 'Тайник: списанное железо, урон +6 и фляга +1');
    }
    const canResumeWorld = this.rules.mode === 'playing';
    this.time.paused = !canResumeWorld;
    if (canResumeWorld && !this.hitStopActive) {
      this.physics.resume();
      this.tweens.resumeAll();
      this.resumeActorAnimations();
    } else if (!canResumeWorld) {
      this.physics.pause();
      this.tweens.pauseAll();
      this.pauseActorAnimations();
    }
    this.clearInput();
    this.emitState();
  }

  private updateEnemyHealthBar(enemy: Enemy): void {
    const existing = enemy.getData('healthBar') as Phaser.GameObjects.Graphics | undefined;
    const visible = enemy.showsHealthBar;
    if (!visible) { existing?.setVisible(false); return; }
    const bar = existing ?? this.add.graphics().setDepth(7);
    const width = enemy.kind === 'boss' ? 50 : 29;
    const x = enemy.x - width / 2;
    const y = enemy.y - (enemy.kind === 'boss' ? 51 : 38);
    bar.clear().setVisible(true);
    bar.fillStyle(0x182127, 0.9).fillRect(x - 1, y - 1, width + 2, 5);
    bar.fillStyle(enemy.kind === 'boss' ? 0xffa46e : 0xdceebd, 0.95).fillRect(x, y, width * (enemy.hp / enemy.maxHp), 3);
    enemy.setData('healthBar', bar);
  }

  private onDeath(): void {
    this.cancelPlayerActions(); this.cancelEnemyActions(); this.cancelHitStop();
    this.setMessage('Вы пали. Нажмите «Заново»', Number.POSITIVE_INFINITY);
    this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true; this.pauseActorAnimations();
    this.player.anims.resume(); this.player.play('hero-death').setAlpha(1);
    this.clearInput(); this.emitState();
  }
  private onVictory(): void {
    this.cancelPlayerActions(); this.cancelEnemyActions(); this.cancelHitStop();
    this.setMessage('Заказ доставлен. Приятного аппетита.', Number.POSITIVE_INFINITY);
    this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true; this.pauseActorAnimations(); this.clearInput(); this.emitState();
  }

  private handleCommand(command: GameCommand): void {
    if (command === 'start' || command === 'restart') {
      this.scene.stop('Dialogue');
      (this.ambience as Phaser.Sound.WebAudioSound | undefined)?.setVolume(this.ambienceVolume);
      this.campaign.reset(); this.rules.start(); this.resumeWorld(); this.buildStage(0); this.startAmbience();
      this.beginDialogue('phone-call'); return;
    }
    if (command === 'pause') { if (this.rules.pause()) { this.rules.cancelCacheChoice(); this.cancelPlayerActions(); this.cancelHitStop(); this.freezeWorld(); if (this.scene.isActive('Dialogue')) this.scene.pause('Dialogue'); this.emitState(); } return; }
    if (command === 'resume') { if (this.rules.resume()) { if (this.rules.mode === 'dialogue') this.scene.resume('Dialogue'); else this.resumeWorld(); this.clearInput(); this.emitState(); } return; }
    if (command === 'heal') { this.tryHeal(); return; }
    if (command === 'cache-damage') { this.closeCacheChoice('damage'); return; }
    if (command === 'cache-health') { this.closeCacheChoice('health'); return; }
    if (command === 'cache-cancel') { this.closeCacheChoice(); return; }
    if (command === 'mute') { this.sound.mute = !this.sound.mute; return; }
    if (command === 'shake') { this.shakeEnabled = !this.shakeEnabled; if (!this.shakeEnabled) this.cameras.main.shakeEffect.reset(); this.setMessage(this.shakeEnabled ? 'Тряска камеры включена' : 'Тряска камеры выключена'); }
  }

  private pauseForFocusLoss(): void {
    if (this.rules.mode === 'playing' || this.rules.mode === 'dialogue') this.handleCommand('pause');
  }
  private clearInput(): void { this.input.keyboard?.resetKeys(); this.pressedActions.clear(); this.clearActionBuffers(); }
  private clearActionBuffers(): void { this.dashBufferMs = 0; this.jumpBufferMs = 0; }
  private cancelPlayerActions(): void { this.cancelAttack(); this.rules.cancelHealing(); this.kick.cancel(); this.clearActionBuffers(); this.player?.cancelActions(); }
  private cancelEnemyActions(): void {
    this.enemies?.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      enemy.cancelActions();
      this.enemyPresentations.get(enemy.id)?.update(enemy);
    });
  }
  private movementIntent(): 1 | -1 | undefined {
    if (!this.keys || !this.cursors) return undefined;
    const direction = Number(this.cursors.right.isDown || this.keys.right.isDown) - Number(this.cursors.left.isDown || this.keys.left.isDown);
    return direction === 0 ? undefined : direction > 0 ? 1 : -1;
  }
  private pauseActorAnimations(): void {
    this.defeatEffects?.pause();
    this.groundEffects?.pause();
    this.player?.anims.pause();
    this.enemies?.getChildren().forEach((child) => (child as Enemy).anims.pause());
  }
  private resumeActorAnimations(): void {
    this.defeatEffects?.resume();
    this.groundEffects?.resume();
    this.player?.anims.resume();
    this.enemies?.getChildren().forEach((child) => (child as Enemy).anims.resume());
  }
  private playSound(key: string): void { if (this.cache.audio.exists(key)) this.sound.play(key, { volume: 0.32 }); }
  private startAmbience(): void {
    if (!this.cache.audio.exists('ambience')) return;
    this.ambience ??= this.sound.add('ambience', { loop: true, volume: 0.16 });
    if (!this.ambience.isPlaying) this.ambience.play();
    (this.ambience as Phaser.Sound.WebAudioSound).setVolume(this.ambienceVolume);
  }
  private setMessage(message: string, durationMs = 2400): void {
    this.message = message;
    this.messageUntil = durationMs === Number.POSITIVE_INFINITY ? durationMs : this.rules.elapsed + durationMs;
  }
  private updateInteractPrompt(): void {
    const cache = this.caches.find((item) => !item.used && Phaser.Math.Distance.Between(this.player.x, this.player.y, item.data.x, item.data.y) < 56);
    if (cache) {
      this.interactPrompt.setText('E — открыть тайник').setPosition(cache.data.x, cache.data.y - 27).setVisible(true);
      return;
    }
    if (this.campaign.nextScene === this.level.introScene && Math.abs(this.player.x - this.level.bossIntroX) < 65) {
      this.interactPrompt.setText(this.routeEnemiesRemain() ? 'Сначала расчистите маршрут' : 'E — поговорить').setPosition(this.level.bossIntroX, 214).setVisible(true);
      return;
    }
    if (Math.abs(this.player.x - this.level.exitX) < 65) {
      this.interactPrompt.setText(this.enemies.countActive(true) ? 'Путь закрыт' : this.rules.stage === 2 ? 'E — постучать' : 'E — пройти дальше').setPosition(this.level.exitX, 214).setVisible(true);
      return;
    }
    this.interactPrompt.setVisible(false);
  }
  private floatingText(x: number, y: number, text: string, color: string): void {
    const label = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '12px', color }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: label, y: y - 20, alpha: 0, duration: 520, onComplete: () => label.destroy() });
  }
  private snapshot(): GameSnapshot {
    const boss = this.enemies?.getChildren().map((child) => child as Enemy).find((enemy) => enemy.kind === 'boss');
    const bossVisible = Boolean(boss?.engaged);
    const objective = this.bossActivated && boss ? `Победи: ${boss.displayName}`
      : this.campaign.nextScene === this.level.introScene && !this.routeEnemiesRemain() ? 'E у арены — поговорить'
      : this.enemies?.countActive(true) ? this.routeObjective() : this.rules.stage === 2 ? 'E у двери Насти' : 'E у выхода';
    return { mode: this.rules.mode, stage: this.rules.stage, location: this.level?.name ?? 'Батуми', hp: this.rules.hp, maxHp: this.rules.maxHp, flasks: this.rules.flasks, kills: this.rules.kills, totalEnemies: this.level?.enemies.length ?? 0, shards: this.rules.shards, elapsed: Math.floor(this.rules.elapsed / 1000), dashReady: this.rules.dashReady, bossHp: bossVisible ? boss!.hp : 0, bossMaxHp: bossVisible ? boss!.maxHp : 0, bossName: boss?.displayName ?? '', hasPackage: this.campaign.hasPackage, objective, message: this.rules.mode === 'title' || this.rules.elapsed < this.messageUntil ? this.message : '', weaponLevel: this.rules.weaponLevel, healing: this.rules.healing, healingProgress: this.rules.healingProgress, abilityReady: this.rules.abilityReady, abilityCooldownProgress: this.rules.abilityCooldownProgress, cacheChoiceOpen: this.rules.cacheChoiceOpen };
  }
  private emitState(): void { bridge.emit('state', this.snapshot()); }
  private cleanUp(): void {
    this.cancelAttack(); this.cancelHitStop(); this.combatEffects?.destroy();
    this.groundEffects?.destroy();
    this.defeatEffects?.destroy();
    this.enemyPresentations.forEach((presentation) => presentation.destroy());
    this.enemyPresentations.clear();
    bridge.off('command', this.commandHandler);
    this.input.keyboard?.off('keydown', this.pressHandler);
    bridge.off('dialogue-complete', this.dialogueCompleteHandler);
    this.scene.stop('Dialogue');
    this.input.keyboard?.off('keydown-M', this.muteHandler);
    this.input.off('pointerdown', this.pointerHandler);
    this.ambience?.destroy(); this.ambience = undefined;
    window.removeEventListener('blur', this.focusHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}
