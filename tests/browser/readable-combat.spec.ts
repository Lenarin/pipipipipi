import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Начать/ }).click();
  await page.getByRole('button', { name: 'Пропустить сцену' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
}

async function isolateFirstWalker(page: Page) {
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.enemies.getChildren().forEach((enemy: any) => { if (enemy !== walker) enemy.setActive(false).setVisible(false); });
    scene.player.body.reset(walker.x - 42, walker.y);
    scene.player.body.moves = false;
    walker.body.moves = false;
    walker.activate();
    walker.cooldownMs = 0;
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  })).toBe('windup');
}

test('a ready dash uses held movement direction even during the opposite-facing combo', async ({ page }) => {
  await start(page);
  const before = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.player.body.reset(400, 276);
    scene.attack.request(1);
    scene.player.beginAttack();
    return scene.player.x;
  });
  await page.keyboard.down('KeyA');
  await page.keyboard.press('ShiftLeft', { delay: 40 });
  await page.waitForTimeout(120);
  await page.keyboard.up('KeyA');

  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x)).toBeLessThan(before - 30);
});

test('a slightly early dash request is buffered until cooldown completes', async ({ page }) => {
  await start(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('ShiftLeft', { delay: 30 });
  await page.waitForTimeout(650);
  const before = await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x);
  await page.keyboard.press('ShiftLeft', { delay: 25 });
  await page.waitForTimeout(140);
  await page.keyboard.up('KeyD');

  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.x)).toBeGreaterThan(before + 30);
});

test('holding jump produces a visibly higher arc than releasing it early', async ({ page }) => {
  await start(page);
  const beginApexWatch = () => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    (window as any).__jumpApex = scene.player.y;
    (window as any).__jumpWatch = window.setInterval(() => {
      (window as any).__jumpApex = Math.min((window as any).__jumpApex, scene.player.y);
    }, 5);
  });
  const finishApexWatch = () => page.evaluate(() => {
    window.clearInterval((window as any).__jumpWatch);
    return (window as any).__jumpApex as number;
  });

  await beginApexWatch();
  await page.keyboard.press('Space', { delay: 20 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded), { intervals: [20] }).toBe(false);
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  const tapApex = await finishApexWatch();

  await beginApexWatch();
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded), { intervals: [20] }).toBe(false);
  await page.waitForTimeout(300);
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.grounded)).toBe(true);
  const holdApex = await finishApexWatch();

  expect(holdApex).toBeLessThan(tapApex - 8);
});

test('crossing behind a committed melee attack avoids its directional active stroke', async ({ page }) => {
  await start(page);
  await isolateFirstWalker(page);
  const hp = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.player.body.reset(walker.x + 36, walker.y);
    return scene.rules.hp;
  });

  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    return walker.state === 'recovery' || walker.state === 'idle';
  }), { timeout: 2_500 }).toBe(true);
  expect(await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').rules.hp)).toBe(hp);
});

test('vertical separation does not freeze a committed attack before active and recovery', async ({ page }) => {
  await start(page);
  await isolateFirstWalker(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.player.body.reset(scene.player.x, 120);
  });

  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  }), { timeout: 1_500, intervals: [20] }).toBe('active');
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  }), { timeout: 1_500 }).toBe('recovery');
});

test('standing in the visible active strike hurts once and recovery cannot hurt', async ({ page }) => {
  await start(page);
  await isolateFirstWalker(page);
  const before = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    const shape = walker.attackShape;
    scene.player.body.reset(shape.centerX, shape.centerY);
    return scene.rules.hp;
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  }), { timeout: 1_500, intervals: [20] }).toBe('active');
  const active = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    const after = scene.rules.hp;
    scene.rules.immunityUntil = 0;
    scene.resolveEnemyActive(walker);
    scene.resolveEnemyActive(walker);
    return { after, afterRepeatedResolution: scene.rules.hp };
  });
  expect(active.after).toBeLessThan(before);
  expect(active.afterRepeatedResolution).toBe(active.after);

  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  })).toBe('recovery');
  const recovery = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.rules.hp = 100;
    scene.rules.immunityUntil = 0;
    const shape = walker.attackShape;
    scene.player.body.reset(shape.centerX, shape.centerY);
    scene.resolveEnemyActive(walker);
    return scene.rules.hp;
  });
  expect(recovery).toBe(100);
});

test('fixture: the rendered ground swing reaches a hound without vertical target inflation', async ({ page }) => {
  await start(page);
  const before = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const hound = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-hound-1');
    scene.enemies.getChildren().forEach((enemy: any) => { if (enemy !== hound) enemy.setActive(false).setVisible(false); });
    scene.rules.grantImmunity(2_000);
    scene.player.body.reset(hound.x - 38, 285);
    scene.player.facing = 1;
    hound.body.moves = false;
    return hound.hp;
  });
  await page.keyboard.press('KeyJ', { delay: 30 });

  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-hound-1').hp;
  }), { timeout: 1_000 }).toBeLessThan(before);
});

test('fixture: a boss volley owns one successful hit across all projectiles after the caster is gone', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.rules.stage = 2;
    scene.buildStage(2);
    const boss = scene.enemies.getChildren().find((enemy: any) => enemy.kind === 'boss');
    scene.resolveEnemyEvent({ type: 'active', enemy: boss, attack: 'boss-volley', facing: -1 });
    const shots = [...scene.projectiles.getChildren()];
    boss.destroy();
    scene.rules.hp = 100;
    for (const shot of shots) {
      scene.rules.immunityUntil = 0;
      scene.hitFromProjectile(shot);
    }
    return { shotCount: shots.length, hp: scene.rules.hp };
  });

  expect(result).toEqual({ shotCount: 3, hp: 82 });
});

test('pause cancels player dash while freezing and then continuing enemy windup', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.player.body.reset(walker.x - 46, walker.y);
    walker.body.moves = false;
    walker.activate();
    walker.cooldownMs = 0;
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  })).toBe('windup');
  await page.keyboard.down('KeyD');
  await page.keyboard.press('ShiftLeft', { delay: 20 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.isDashing)).toBe(true);
  const paused = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    const progress = walker.attackProgress;
    scene.handleCommand('pause');
    return { mode: scene.rules.mode, dashing: scene.player.isDashing, enemyPhase: walker.state, progress };
  });
  await page.keyboard.up('KeyD');
  expect(paused).toMatchObject({ mode: 'paused', dashing: false, enemyPhase: 'windup' });
  await page.waitForTimeout(120);
  const frozen = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    return { enemyPhase: walker.state, progress: walker.attackProgress };
  });
  expect(frozen).toEqual({ enemyPhase: 'windup', progress: paused.progress });

  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').handleCommand('resume'));
  await page.waitForTimeout(120);
  const resumed = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    return { dashing: scene.player.isDashing, enemyPhase: walker.state, progress: walker.attackProgress };
  });
  expect(resumed.dashing).toBe(false);
  expect(resumed.enemyPhase).toBe('windup');
  expect(resumed.progress).toBeGreaterThan(paused.progress);
});

test('focus loss clears player actions while freezing active enemy state and preserving jump count', async ({ page }) => {
  await start(page);
  await isolateFirstWalker(page);
  await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    scene.player.body.reset(scene.player.x, 180);
  });
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  }), { intervals: [20] }).toBe('active');
  await page.keyboard.press('ShiftLeft', { delay: 20 });
  await expect.poll(() => page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').player.isDashing)).toBe(true);
  const paused = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.player.body.moves = true;
    scene.player.body.setVelocityY(-100);
    scene.player.jumps = 1;
    scene.player.jumpBufferMs = 120;
    scene.jumpBufferMs = 120;
    const progress = walker.attackProgress;
    window.dispatchEvent(new Event('blur'));
    return {
      mode: scene.rules.mode,
      dashing: scene.player.isDashing,
      enemyPhase: walker.state,
      playerJumpBuffer: scene.player.jumpBufferMs,
      sceneJumpBuffer: scene.jumpBufferMs,
      jumps: scene.player.jumps,
      progress,
    };
  });
  expect(paused).toMatchObject({ mode: 'paused', dashing: false, enemyPhase: 'active', playerJumpBuffer: 0, sceneJumpBuffer: 0, jumps: 1 });
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    return { enemyPhase: walker.state, progress: walker.attackProgress };
  })).toEqual({ enemyPhase: 'active', progress: paused.progress });

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.evaluate(() => (window as any).__GAME__.scene.getScene('Game').handleCommand('resume'));
  await page.waitForTimeout(120);
  const resumed = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    return { vy: scene.player.body.velocity.y, jumps: scene.player.jumps, dashing: scene.player.isDashing, enemyPhase: walker.state };
  });
  expect(resumed.dashing).toBe(false);
  expect(resumed.jumps).toBe(1);
  expect(resumed.vy).toBeGreaterThan(-100);
  expect(resumed.enemyPhase).not.toBe('windup');
});

test('death clears committed enemy attacks while pause remains a freeze-only lifecycle', async ({ page }) => {
  await start(page);
  await isolateFirstWalker(page);
  await expect.poll(() => page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    return scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1').state;
  }), { intervals: [20] }).toBe('active');

  const phase = await page.evaluate(() => {
    const scene = (window as any).__GAME__.scene.getScene('Game');
    const walker = scene.enemies.getChildren().find((enemy: any) => enemy.id === 'yard-walker-1');
    scene.rules.hp = 0;
    scene.rules.mode = 'dead';
    scene.onDeath();
    return walker.state;
  });
  expect(phase).toBe('idle');
});
