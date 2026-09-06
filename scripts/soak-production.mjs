import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Repeated real keyboard/UI actions against the immutable production build.
// CDP collects diagnostics and garbage at settled checkpoints; no game internals
// are exposed or modified. This checks retained growth, not peak heap use.
const rounds = Number(process.argv[2] ?? 60);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 180) throw new Error('Use 1..180 soak rounds');
const tag = process.argv[3] ?? 'v08';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(), cdp = await context.newCDPSession(page);
const errors = [], warnings = [], failed = [], checkpoints = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
page.on('requestfailed', r => failed.push(r.url()));
const started = Date.now();
let deaths = 0, roundsWithReward = 0;
async function checkpoint(round) {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const values = Object.fromEntries(metrics.map(m => [m.name, m.value]));
  const dom = await cdp.send('Memory.getDOMCounters');
  const result = { round, seconds: (Date.now() - started) / 1000, heap: values.JSHeapUsedSize,
    nodes: dom.nodes, listeners: dom.jsEventListeners, documents: dom.documents };
  checkpoints.push(result); console.log(JSON.stringify(result));
}
try {
  await mkdir('.artifacts', { recursive: true });
  await cdp.send('Performance.enable');
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#start-button').click();
  await page.locator('#dialogue-skip').click();
  if (await page.evaluate(() => '__GAME__' in window)) throw new Error('Expected a production build without dev handles');
  await page.waitForTimeout(400); await checkpoint(0);
  for (let round = 1; round <= rounds; round++) {
    await page.keyboard.down('KeyD'); await page.waitForTimeout(2000); await page.keyboard.up('KeyD');
    for (const spacing of [310, 440, 860]) { await page.keyboard.press('KeyJ', { delay: 25 }); await page.waitForTimeout(spacing); }
    if (Number((await page.locator('#shards').innerText()).replace(/[^0-9]/g, '')) > 0) roundsWithReward++;
    await page.keyboard.down('Space'); await page.waitForTimeout(330); await page.keyboard.up('Space');
    await page.waitForTimeout(80); await page.keyboard.down('Space'); await page.waitForTimeout(300); await page.keyboard.up('Space');
    await page.keyboard.press('KeyF', { delay: 25 });
    await page.keyboard.press('ShiftLeft', { delay: 25 }); await page.waitForTimeout(700);
    if (await page.locator('#overlay').isHidden()) {
      if (round % 2 === 0) await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      else await page.keyboard.press('Escape', { delay: 25 });
      await page.getByRole('heading', { name: 'Пауза' }).waitFor();
      const time = await page.locator('#run-timer').innerText();
      await page.waitForTimeout(220);
      if (await page.locator('#run-timer').innerText() !== time) throw new Error('Run timer advanced during pause');
      // Synthetic blur must be paired with synthetic focus; clicking an already-focused
      // headless window cannot generate the OS focus event that normally resumes Web Audio.
      if (round % 2 === 0) await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
      await page.waitForTimeout(120); await page.keyboard.press('Escape', { delay: 25 });
    } else deaths++;
    await page.getByRole('button', { name: /НАЧАТЬ ЗАНОВО/ }).click();
    await page.locator('#dialogue-panel').waitFor({ state: 'visible' });
    await page.keyboard.press('Enter', { delay: 25 });
    await page.keyboard.press('Escape', { delay: 25 });
    await page.getByRole('heading', { name: 'Пауза' }).waitFor();
    await page.getByRole('button', { name: /ПРОДОЛЖИТЬ/ }).click();
    await page.locator('#dialogue-skip').click();
    await page.waitForTimeout(450);
    if (await page.locator('#health-label').innerText() !== '100 / 100') throw new Error('Restart did not restore health');
    if (await page.locator('#shards').innerText() !== '◇ 0') throw new Error('Restart retained a previous reward');
    if (errors.length || failed.length || warnings.some(w => /Cannot (pause|resume).*Scene/.test(w))) throw new Error('Browser errors or scene lifecycle warnings in soak');
    if (round % 10 === 0 || round === rounds) await checkpoint(round);
  }
  const first = checkpoints[0], last = checkpoints.at(-1);
  const growth = { heap: last.heap - first.heap, nodes: last.nodes - first.nodes, listeners: last.listeners - first.listeners };
  const passed = roundsWithReward >= rounds * .8 && growth.heap < 10 * 1024 * 1024 && growth.nodes < 100 && growth.listeners < 10;
  const report = { passed, rounds, deaths, roundsWithReward, production: true, devHandleAbsent: true, seconds: (Date.now() - started) / 1000,
    growth, checkpoints, errors, warnings, failed, dialogueCycles: rounds, note: 'Heap/DOM checkpoints follow forced GC; this is retained-growth evidence, not a peak-memory or low-end-device benchmark. Focus events are synthetic blur/focus; dialogue is revealed and skipped via normal UI each restart.' };
  await writeFile(`.artifacts/${tag}-production-soak.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `.artifacts/${tag}-production-soak.png` });
  console.log(JSON.stringify(report));
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  await writeFile(`.artifacts/${tag}-production-soak.json`, JSON.stringify({ failure: error.message, checkpoints, errors, warnings, failed }, null, 2));
  await page.screenshot({ path: `.artifacts/${tag}-production-soak-failure.png` });
  process.exitCode = 1;
} finally { await browser.close(); }
