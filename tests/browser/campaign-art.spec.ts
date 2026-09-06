import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const evidence = '.superpowers/sdd/2026-09-06-larik-delivery/art-evidence';

test('campaign textures contain every portrait expression and complete unclipped actor frames', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__GAME__?.scene.getScene('Game').player))).toBe(true);
  const failures = await page.evaluate(() => {
    const textures = (window as any).__GAME__.textures;
    const keys = [
      ...['larik', 'nastya', 'baker', 'mark', 'chief', 'miller'].map(name => [`portrait-${name}`, 12]),
      ...['mark', 'chief', 'miller'].map(name => [`boss-${name}`, 24]),
      ...['street', 'police', 'federal'].flatMap(f => ['walker', 'spitter', 'hound'].map(r => [`enemy-${f}-${r}`, 12])),
      ...['wanted', 'flight', 'descent', 'wreck', 'food', 'eating'].map(name => [`story-v8-${name}`, 1]),
    ] as [string, number][];
    const failures: string[] = [];
    for (const [key, count] of keys) {
      if (!textures.exists(key)) { failures.push(`${key}: missing`); continue; }
      const texture = textures.get(key);
      for (let i = 0; i < count; i++) {
        const frame = texture.get(count === 1 ? '__BASE' : i);
        const canvas = document.createElement('canvas'); canvas.width = frame.cutWidth; canvas.height = frame.cutHeight;
        const context = canvas.getContext('2d')!;
        context.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let opaque = 0, edge = 0, magenta = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const p = (y * canvas.width + x) * 4;
          if (pixels[p + 3] < 100) continue;
          opaque++;
          if (!x || !y || x === canvas.width - 1 || y === canvas.height - 1) edge++;
          if (pixels[p] > 150 && pixels[p + 2] > 150 && pixels[p + 1] < 60) magenta++;
        }
        if (opaque < 60) failures.push(`${key}/${i}: empty`);
        if (count > 1 && edge) failures.push(`${key}/${i}: clipped ${edge}`);
        if (magenta) failures.push(`${key}/${i}: unkeyed ${magenta}`);
      }
    }
    return failures;
  });
  expect(failures).toEqual([]);
});

test('variant animation and collapse preserve costumes, roots and body dimensions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  const result = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game'); scene.scene.pause();
    return ['mark', 'chief', 'miller', 'street', 'police', 'federal'].map((variant, i) => {
      const boss = i < 3;
      const actor = new Enemy(scene, `art-${variant}`, boss ? 'boss' : 'walker', 300, 220,
        boss ? { bossId: variant as any } : { faction: variant as any });
      actor.body.setVelocityX(30); actor.renderPose();
      const walkTexture = actor.anims.currentAnim.frames[1].textureKey;
      const feet = actor.y + (actor.spriteLayout.anchorY - actor.originY * actor.spriteLayout.height) * actor.scaleY;
      scene.defeatEffects.show(actor, true);
      const remains = scene.children.getChildren().filter((child: any) => child.name === 'enemy-remains').at(-1);
      return { variant, texture: actor.texture.key, walkTexture, deathTextures: [...new Set(remains.anims.currentAnim.frames.map((frame: any) => frame.textureKey))],
        bodyWidth: actor.body.sourceWidth, bodyHeight: actor.body.sourceHeight, position: [actor.x, actor.y],
        feet, corpseFeet: remains.y + (actor.spriteLayout.anchorY - remains.originY * actor.spriteLayout.height) * remains.scaleY };
    });
  });
  for (const actor of result) {
    const texture = ['mark', 'chief', 'miller'].includes(actor.variant) ? `boss-${actor.variant}` : `enemy-${actor.variant}-walker`;
    expect(actor.texture).toBe(texture); expect(actor.walkTexture).toBe(texture); expect(actor.deathTextures).toEqual([texture]);
    expect([actor.bodyWidth, actor.bodyHeight]).toEqual(texture.startsWith('boss') ? [44, 62] : [18, 30]);
    expect(actor.corpseFeet).toBe(actor.feet);
    expect(actor.position).toEqual([300, 220]);
  }
});

test('exports native atlas contact sheets and three sunny playable locations', async ({ page }) => {
  test.setTimeout(60000);
  await mkdir(evidence, { recursive: true });
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  const galleries = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game'); scene.scene.pause();
    const groups = {
      portraits: ['larik', 'nastya', 'baker', 'mark', 'chief', 'miller'].map(n => `portrait-${n}`),
      bosses: ['mark', 'chief', 'miller'].map(n => `boss-${n}`),
      factions: ['street', 'police', 'federal'].flatMap(f => ['walker', 'spitter', 'hound'].map(r => `enemy-${f}-${r}`)),
    };
    return Object.entries(groups).map(([name, keys]) => {
      const w = name === 'portraits' ? 108 : 120, h = name === 'portraits' ? 108 : 100;
      const columns = name === 'portraits' ? 12 : name === 'bosses' ? 24 : 12;
      const canvas = document.createElement('canvas'); canvas.width = columns * w; canvas.height = keys.length * (h + 20);
      const context = canvas.getContext('2d')!; context.imageSmoothingEnabled = false;
      context.fillStyle = '#eddfbd'; context.fillRect(0, 0, canvas.width, canvas.height);
      keys.forEach((key, row) => {
        context.fillStyle = '#243941'; context.font = '12px monospace'; context.fillText(key, 5, row * (h + 20) + 14);
        for (let i = 0; i < columns; i++) {
          const frame = scene.textures.getFrame(key, i);
          if (name === 'portraits') context.drawImage(frame.source.image, frame.cutX, frame.cutY, 108, 108, i * w, row * (h + 20) + 20, 108, 108);
          else context.drawImage(frame.source.image, frame.cutX + 36, frame.cutY + 55, 120, 100, i * w, row * (h + 20) + 20, 120, 100);
        }
      });
      return { name, data: canvas.toDataURL().split(',')[1] };
    });
  });
  for (const gallery of galleries) await writeFile(`${evidence}/${gallery.name}.png`, Buffer.from(gallery.data, 'base64'));
  for (const stage of [0, 1, 2]) {
    const result = await page.evaluate((index) => {
      const scene = (window as any).__GAME__.scene.getScene('Game');
      scene.rules.stage = index; scene.buildStage(index); scene.scene.resume(); scene.physics.resume();
      scene.cameras.main.stopFollow().setScroll(0, 30);
      return { theme: scene.data.get('campaign-theme'), background: scene.children.getChildren().filter((child: any) => child.name.startsWith('background-')).map((child: any) => child.texture.key),
        rain: scene.children.getChildren().filter((child: any) => child.texture?.key === 'rain').length };
    }, stage);
    expect(result.theme).toBe(['batumi', 'airport', 'suburb'][stage]);
    expect(result.background).toEqual(Array(3).fill(`scene-${result.theme}`)); expect(result.rain).toBe(0);
    await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
    await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').scene.pause());
    await page.screenshot({ path: `${evidence}/level-${result.theme}.png`, clip: (await page.locator('canvas').first().boundingBox())! });
    const native = await page.evaluate(() => new Promise<string>(resolve => (window as any).__GAME__.renderer.snapshot((image: HTMLImageElement) => resolve(image.src.split(',')[1]))));
    await writeFile(`${evidence}/level-${result.theme}-logical.png`, Buffer.from(native, 'base64'));
  }
});

test('new boss engagements approach into visible reach, allow escape and expose recovery', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  const results = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game'); scene.scene.pause();
    return ['mark', 'chief'].map(id => {
      const boss = new Enemy(scene, `art-range-${id}`, 'boss', 700, 281, { bossId: id as any });
      scene.enemies.add(boss); scene.bossActivated = true; boss.activate(); (boss as any).cooldownMs = 0;
      scene.player.body.reset(850, 286); boss.updateAi(scene.player, 1, true);
      const approach = { state: boss.state, velocity: boss.body.velocity.x };
      scene.player.body.reset(740, 286); boss.updateAi(scene.player, 1, true);
      const warning = boss.attackProfile!.windupMs; boss.updateAi(scene.player, warning, true);
      scene.player.body.reset(850, 286); scene.rules.immunityUntil = 0;
      const hp = scene.rules.hp; scene.resolveEnemyActive(boss);
      const escaped = scene.rules.hp === hp;
      boss.updateAi(scene.player, boss.attackProfile!.activeMs, true);
      const recovery = boss.state; const punished = boss.receiveHit(16, 1); const hpAfter = boss.hp;
      return { id, approach, escaped, recovery, punished, hpAfter };
    });
  });
  for (const result of results) {
    expect(result.approach.state).toBe('idle'); expect(result.approach.velocity).toBeGreaterThan(0);
    expect(result.escaped).toBe(true); expect(result.recovery).toBe('recovery'); expect(result.punished).toBe(true); expect(result.hpAfter).toBe(344);
  }
});

test('captures each generated boss commitment at logical resolution and fullscreen', async ({ page }) => {
  test.setTimeout(60000); await mkdir(evidence, { recursive: true });
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator('#fullscreen-button').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  for (const [bossId, stage, attacks] of [['mark', 0, 2], ['chief', 1, 2], ['miller', 2, 1]] as const) {
    await page.evaluate(async ({ bossId, stage }) => {
      const { Enemy } = await import('/src/gameplay/Enemy.ts');
      const { EnemyAttackPresentation } = await import('/src/game/EnemyAttackPresentation.ts');
      const scene = (window as any).__GAME__.scene.getScene('Game'); scene.rules.stage = stage; scene.buildStage(stage);
      scene.enemies.clear(true, true); scene.enemyPresentations.forEach((p: any) => p.destroy()); scene.enemyPresentations.clear();
      if (scene.scene.isActive()) scene.scene.pause();
      scene.cameras.main.stopFollow().setScroll(80, 30);
      scene.player.body.reset(420, 285.875); scene.player.setFrame(0).anims.stop();
      const boss = new Enemy(scene, 'art-evidence-boss', 'boss', 360, 281, { bossId }); scene.enemies.add(boss);
      if (bossId === 'miller') boss.aimTarget = { x: 420, y: 285.875 };
      scene.enemyPresentations.set(boss.id, new EnemyAttackPresentation(scene));
    }, { bossId, stage });
    for (let attack = 0; attack < attacks; attack++) for (const phase of ['windup', 'active', 'recovery']) {
      const frame = await page.evaluate(({ phase }) => {
        const scene = (window as any).__GAME__.scene.getScene('Game'), boss = scene.enemies.getChildren()[0];
        if (phase === 'windup') { boss.attackCycle.cancel(); boss.attackCycle.start(boss.chooseProfile(), 1); boss.attackCycle.advance(boss.attackProfile.windupMs * .65); }
        else if (phase === 'active') boss.attackCycle.advance(boss.attackProfile.windupMs * .35 + 1);
        else boss.attackCycle.advance(boss.attackProfile.activeMs + boss.attackProfile.recoveryMs * .2);
        boss.state = boss.attackCycle.state.phase; scene.enemyPresentations.get(boss.id).update(boss);
        if (phase === 'active' && boss.bossId === 'miller') for (const spread of [-1, 0, 1]) scene.fireProjectile(boss, spread, true, 1, { consumed: false }, boss.aimTarget);
        return { phase: boss.state, texture: boss.texture.key, frame: boss.frame.name };
      }, { phase });
      expect(frame.phase).toBe(phase); expect(frame.texture).toBe(`boss-${bossId}`);
      await page.waitForTimeout(40);
      const native = await page.evaluate(() => new Promise<string>(resolve => (window as any).__GAME__.renderer.snapshot((image: HTMLImageElement) => resolve(image.src.split(',')[1]))));
      await writeFile(`${evidence}/${bossId}-${attack}-${phase}-logical.png`, Buffer.from(native, 'base64'));
      await page.locator('canvas').first().screenshot({ path: `${evidence}/${bossId}-${attack}-${phase}-fullscreen.png` });
    }
  }
});

test('a missing selected portrait blocks startup and a retry reloads the generated assets', async ({ page }) => {
  let fail = true;
  await page.route('**/assets/portrait-miller-v8-keyed-source.png', route => fail ? route.abort() : route.continue());
  await page.goto('/');
  await expect(page.locator('#start-button')).toContainText('ПОВТОРИТЬ');
  expect(await page.evaluate(() => Boolean((window as any).__GAME__?.scene.getScene('Game').player))).toBe(false);
  fail = false; await page.locator('#start-button').click();
  await expect(page.getByRole('button', { name: /Начать/ })).toBeEnabled();
});

test('natural chapter transitions show the selected montage, inward portraits, and delivery landmarks', async ({ page }) => {
  test.setTimeout(60000); await mkdir(evidence, { recursive: true });
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  const directions = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Dialogue');
    return { left: scene.left.flipX, right: scene.right.flipX };
  });
  expect(directions).toEqual({ left: false, right: true });
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.grantImmunity(120000));
  for (const [stage, intro, exit, theme] of [[0, 'last-khachapuri', 'wanted', 'batumi'], [1, 'airport-chief', 'rough-landing', 'airport'], [2, 'food-threat', 'delivered', 'suburb']] as const) {
    await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.stage)).toBe(stage);
    await page.evaluate(() => {
      const scene = (window as any).__GAME__.scene.getScene('Game');
      scene.enemies.getChildren().filter((enemy: any) => enemy.kind !== 'boss').forEach((enemy: any) => enemy.destroy());
      scene.player.body.reset(scene.level.bossIntroX, 280);
    });
    await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
    await page.keyboard.press('KeyE', { delay: 40 });
    await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-scene', intro);
    await page.getByRole('button', { name: 'Пропустить сцену' }).click();
    await page.evaluate(() => {
      const scene = (window as any).__GAME__.scene.getScene('Game');
      const boss = scene.enemies.getChildren().find((enemy: any) => enemy.kind === 'boss');
      boss.cancelActions(); boss.receiveHit(10000, 1); scene.resolveBossReinforcements(boss); scene.damageEnemy(boss, 10000);
      [...scene.enemies.getChildren()].forEach((enemy: any) => { enemy.receiveHit(10000, 1); scene.damageEnemy(enemy, 10000); });
      scene.player.body.reset(scene.level.exitX, 280);
      scene.cameras.main.stopFollow().setScroll(scene.level.width - 533, 30);
    });
    await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
    await page.screenshot({ path: `${evidence}/destination-${theme}.png`, clip: (await page.locator('canvas').first().boundingBox())! });
    await page.keyboard.press('KeyE', { delay: 40 });
    await expect(page.locator('#dialogue-panel')).toHaveAttribute('data-scene', exit);
    for (const panel of exit === 'rough-landing' ? ['flight', 'descent', 'wreck'] : exit === 'delivered' ? ['food', 'eating'] : ['wanted']) {
      if (panel === 'eating') {
        for (let guard = 0; guard < 12 && Number(await page.locator('#dialogue-panel').getAttribute('data-line')) < 4; guard++) await page.getByRole('button', { name: 'Далее', exact: true }).click();
      }
      await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Dialogue').montage.texture.key)).toBe(`story-v8-${panel}`);
      await page.screenshot({ path: `${evidence}/story-${panel}.png`, clip: (await page.locator('canvas').first().boundingBox())! });
    }
    await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Заказ доставлен' })).toBeVisible();
});

test('campaign shots originate at the registered gun or throwing hand in both facings', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  const shots = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game'); scene.scene.pause();
    const result = [];
    for (const [variant, dx, dy, texture] of [['miller', 32, -15, 'projectile-round'], ['police', 22, -9, 'projectile-round'], ['federal', 20, -12, 'projectile-round'], ['street', 20, -7, 'projectile-bottle']] as const) {
      const enemy = new Enemy(scene, `muzzle-${variant}`, variant === 'miller' ? 'boss' : 'spitter', 700, 260,
        variant === 'miller' ? { bossId: 'miller' } : { faction: variant });
      enemy.setFrame(variant === 'miller' ? 8 : 7);
      const frame = enemy.frame, image = frame.source.image;
      const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 160;
      const context = canvas.getContext('2d')!; context.drawImage(image, frame.cutX, frame.cutY, 192, 160, 0, 0, 192, 160);
      const x = 96 + dx, y = Math.round(enemy.originY * 160 + dy);
      const muzzlePixels = context.getImageData(x - 2, y - 2, 5, 5).data;
      const opaque = [...muzzlePixels].filter((_, i) => i % 4 === 3 && muzzlePixels[i] > 100).length;
      for (const facing of [-1, 1] as const) {
        enemy.setFlipX(facing < 0);
        scene.fireProjectile(enemy, 0, variant === 'miller', facing, { consumed: false }, variant === 'miller' ? { x: 700 + facing * 200, y: 230 } : undefined);
        const shot = scene.projectiles.getChildren().at(-1);
        result.push({ variant, facing, x: shot.x, y: shot.y, expectedX: 700 + facing * dx * enemy.scaleX,
          expectedY: 260 + dy * enemy.scaleY, texture: shot.texture.key, expectedTexture: texture, muzzleOpaque: opaque,
          aimedSlope: shot.body.velocity.y / shot.body.velocity.x, expectedSlope: (230 - shot.y) / (700 + facing * 200 - shot.x) });
      }
    }
    return result;
  });
  for (const shot of shots) {
    expect(shot.muzzleOpaque, shot.variant).toBeGreaterThan(0);
    expect(shot.x, shot.variant).toBeCloseTo(shot.expectedX, 2); expect(shot.y, shot.variant).toBeCloseTo(shot.expectedY, 2);
    expect(shot.texture).toBe(shot.expectedTexture);
    if (shot.variant === 'miller') expect(shot.aimedSlope).toBeCloseTo(shot.expectedSlope, 4);
  }
});

test('a close frozen Miller target never reverses the native volley through his back', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  const shots = await page.evaluate(async () => {
    const { Enemy } = await import('/src/gameplay/Enemy.ts');
    const scene = (window as any).__GAME__.scene.getScene('Game'); scene.scene.pause();
    const outputs = [];
    for (const facing of [-1, 1] as const) {
      const boss = new Enemy(scene, `close-miller-${facing}`, 'boss', 700, 281, { bossId: 'miller' });
      boss.activate(); (boss as any).cooldownMs = 0; scene.player.body.reset(700 + facing * 8, 290);
      boss.updateAi(scene.player, 1, true); const aim = { ...boss.aimTarget };
      scene.player.body.reset(700 - facing * 100, 280);
      const events = boss.updateAi(scene.player, boss.attackProfile!.windupMs, true);
      events.forEach((event: any) => scene.resolveEnemyEvent(event));
      const rays = scene.projectiles.getChildren().slice(-3);
      outputs.push({ facing: boss.attackFacing, expectedFacing: facing, aim, after: boss.aimTarget,
        velocities: rays.map((ray: any) => ray.body.velocity.x * facing), x: rays.map((ray: any) => ray.x) });
    }
    return outputs;
  });
  for (const result of shots) {
    expect(result.facing).toBe(result.expectedFacing); expect(result.after).toEqual(result.aim);
    expect(result.velocities).toHaveLength(3); result.velocities.forEach((velocity: number) => expect(velocity).toBeGreaterThan(0));
    expect(result.x).toEqual(Array(3).fill(700 + result.expectedFacing * 32));
  }
});

test('newly summoned federal actors settle on the existing Arcade ground collider', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game'); scene.rules.stage = 2; scene.buildStage(2);
    const boss = scene.enemies.getChildren().find((enemy: any) => enemy.bossId === 'miller');
    boss.body.reset(800, 281); boss.hp = 190; boss.cancelActions(); scene.bossActivated = true;
    scene.player.body.reset(760, 273); scene.player.facing = 1; scene.rules.grantImmunity(60000);
    // The real pipe hit crosses half-health during Scene.update and its hit-stop boundary.
    scene.queueAttack(1);
  });
  await page.waitForTimeout(1200);
  const helpers = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().filter((enemy: any) => enemy.id.startsWith('miller-agent-')).map((enemy: any) => ({ id: enemy.id, y: enemy.y, feet: enemy.body.bottom, grounded: enemy.body.blocked.down, bodyHeight: enemy.body.height }));
  });
  expect(helpers).toHaveLength(2);
  for (const helper of helpers) { expect(helper.feet, JSON.stringify(helper)).toBeLessThanOrEqual(313); expect(helper.grounded).toBe(true); }
});
