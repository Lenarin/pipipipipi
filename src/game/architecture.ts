import type Phaser from 'phaser';

function sign(scene: Phaser.Scene, x: number, y: number, label: string, size = 8) {
  return scene.add.text(x, y, label, { fontFamily: 'Consolas, monospace', fontSize: `${size}px`, color: '#fff4d8',
    backgroundColor: '#28545c', padding: { x: 5, y: 3 }, align: 'center', lineSpacing: 3 }).setOrigin(.5).setDepth(-3);
}

function plaster(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
  for (let row = 6; row < height - 3; row += 9) for (let col = 5; col < width - 6; col += 13) {
    const hash = Math.abs(Math.imul(Math.floor(x + col), 31) ^ Math.imul(Math.floor(y + row), 17));
    if (hash % 5 < 2) g.fillStyle(hash % 2 ? 0x9c7654 : 0xffebbc, .22).fillRect(x + col, y + row, hash % 4 + 2, 1);
    if (hash % 19 === 0) g.fillStyle(0xaa8061, .25).fillRect(x + col, y + row + 2, 7, 2).fillRect(x + col + 2, y + row + 4, 4, 1);
  }
  g.fillStyle(0x755642, .18).fillRect(x, y, width, 4).fillRect(x + width - 4, y, 4, height);
  g.fillStyle(0xffedc7, .65).fillRect(x + 1, y + 4, 2, Math.max(0, height - 4));
}

function window(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x73543f).fillRect(x - 3, y - 3, 29, 35);
  g.fillStyle(0x34585f).fillRect(x, y, 23, 29);
  g.fillStyle(0x70afb0).fillRect(x + 2, y + 2, 8, 10).fillRect(x + 13, y + 2, 8, 10);
  g.fillStyle(0xfde4b0).fillRect(x + 10, y, 2, 29).fillRect(x, y + 13, 23, 2);
  g.fillStyle(0xf4d29c).fillRect(x - 5, y + 31, 33, 2);
  g.fillStyle(0x367474).fillRect(x - 9, y - 1, 5, 31).fillRect(x + 27, y - 1, 5, 31);
  for (let yy = y + 3; yy < y + 28; yy += 4) g.fillStyle(0x27585f).fillRect(x - 8, yy, 3, 1).fillRect(x + 28, yy, 3, 1);
}

/** Every bright top edge coincides with an Arcade landing surface. Supports stay behind actors. */
export function drawStructuralPlatform(scene: Phaser.Scene, cx: number, cy: number, width: number, height: number): void {
  const theme = scene.data.get('campaign-theme') as string;
  const x = cx - width / 2, top = cy - height / 2;
  const g = scene.add.graphics().setDepth(-7).setName(`structure-${theme}`);
  const edge = scene.add.graphics().setDepth(1);
  const ink = 0x354d52, cream = 0xffe8b4;
  if (width > 600) {
    g.setDepth(0).fillStyle(theme === 'airport' ? 0x849a9c : theme === 'suburb' ? 0xcbb998 : 0xd8bc95).fillRect(x, top, width, height);
    edge.fillStyle(ink).fillRect(x, top, width, 2).fillStyle(cream).fillRect(x, top + 2, width, 2);
    for (let px = x; px < x + width; px += 42) g.fillStyle(0x667477, .3).fillRect(px, top + 8, 1, height - 8).fillRect(px + 2, top + 25, 37, 1);
    return;
  }
  const supportHeight = Math.max(0, 312 - top - height);
  if (theme === 'airport') {
    g.fillStyle(ink).fillRect(x + 5, top + height, width - 10, supportHeight);
    g.fillStyle(0xb2d8da).fillRect(x + 9, top + height + 3, width - 18, supportHeight - 5);
    for (let px = x + 12; px < x + width - 8; px += 30) {
      g.fillStyle(0xf2f4dd, .55).fillRect(px, top + height + 7, 12, Math.max(0, supportHeight - 17));
      g.fillStyle(0x58787d).fillRect(px + 18, top + height, 3, supportHeight);
      g.lineStyle(1, 0xe8f6df, .5).lineBetween(px + 2, top + height + 15, px + 12, top + height + 7);
    }
    if (top > 240) {
      g.fillStyle(0xc48449).fillRect(x + 12, top - 12, 26, 12);
      g.lineStyle(2, ink).strokeRect(x + 18, top - 17, 13, 5);
    }
    edge.fillStyle(0xe8bd4e).fillRect(x, top, width, height);
    for (let px = x + 5; px < x + width - 6; px += 18) edge.fillStyle(ink).fillRect(px, top + 6, 8, height - 6);
  } else if (theme === 'suburb') {
    g.fillStyle(0xe4ce9c).fillRect(x + 4, top + height, width - 8, supportHeight);
    plaster(g, x + 4, top + height, width - 8, supportHeight);
    for (let py = top + height + 5; py < 310; py += 11) g.fillStyle(0xb89a6d).fillRect(x + 5, py, width - 10, 1);
    for (const px of [x + 9, x + width - 15]) g.fillStyle(0xf7e9c9).fillRect(px, top + height, 6, supportHeight);
    if (supportHeight > 65) {
      g.fillStyle(0x65888b).fillRect(cx - 15, top + height + 18, 30, 29);
      g.lineStyle(3, 0xf7e9c9).strokeRect(cx - 17, top + height + 16, 34, 33).lineBetween(cx, top + height + 16, cx, top + height + 49);
    }
    edge.fillStyle(0xaa7251).fillRect(x, top, width, height);
    for (let px = x + 4; px < x + width; px += 18) edge.fillStyle(0x7b5948).fillRect(px, top + 6, 1, height - 6);
  } else {
    g.fillStyle(0xe1ba86).fillRect(x + 3, top + height, width - 6, supportHeight);
    plaster(g, x + 3, top + height, width - 6, supportHeight);
    for (let px = x + 14; px < x + width - 22; px += 42) {
      if (supportHeight > 45) {
        window(g, px, top + height + 12);
      }
      g.fillStyle(0x9e6653).fillRect(px, top - 17, 2, 17);
      g.lineStyle(1, 0x9e6653).lineBetween(px, top - 14, px + 13, top - 2);
      g.fillStyle(0xf0cea0).fillRect(px, top - 17, 1, 17);
    }
    g.fillStyle(0xaf7453).fillRect(x, top - 19, width, 3);
    g.fillStyle(0xefc992).fillRect(x, top - 19, width, 1);
    g.lineStyle(3, 0x8e6148).lineBetween(x + 6, top + height + 13, x + 22, top + height).lineBetween(x + width - 6, top + height + 13, x + width - 22, top + height);
    edge.fillStyle(0xb37a55).fillRect(x, top, width, height);
  }
  edge.fillStyle(ink).fillRect(x, top, width, 2).fillStyle(cream).fillRect(x, top + 2, width, 2);
  edge.fillStyle(0x4a4c43, .45).fillRect(x, top + height - 3, width, 3);
  for (let px = x + 5; px < x + width - 5; px += 19) edge.fillStyle(0xf3d89b, .5).fillRect(px, top + height - 5, 9, 1);
}

export function decorateArchitecture(scene: Phaser.Scene, stage: number, width: number): void {
  const g = scene.add.graphics().setDepth(-9);
  if (stage === 0) {
    g.fillStyle(0xe9bf89).fillRect(0, 169, 164, 143);
    plaster(g, 0, 169, 164, 143);
    g.fillStyle(0xa05c43).fillRect(0, 161, 170, 9);
    g.fillStyle(0x347a82).fillRect(18, 258, 55, 54).fillRect(86, 258, 58, 54);
    g.fillStyle(0xf9d691).fillRect(23, 267, 45, 33);
    g.fillStyle(0x885d42).fillRect(25, 292, 41, 2).fillRect(25, 273, 41, 2);
    g.fillStyle(0xffecb4).fillRect(20, 264, 3, 41).fillRect(86, 258, 3, 54);
    g.fillStyle(0xe5c174).fillRect(135, 282, 3, 7);
    for (let x = 27; x < 67; x += 12) g.fillStyle(0xbe7637).fillEllipse(x, 287, 10, 6);
    for (let x = 8; x < 164; x += 20) g.fillStyle(x % 40 ? 0xffebbb : 0xd37d5a).fillRect(x, 242, 20, 10);
    sign(scene, 85, 229, 'პური / ХАЧАПУРИ', 9);
    sign(scene, 85, 194, 'ПЕКАРНЯ · ОТКРЫТО');
    const bakeryX = width - 145;
    g.fillStyle(0xe9bf89).fillRect(bakeryX, 189, 145, 123);
    plaster(g, bakeryX, 189, 145, 123);
    g.fillStyle(0x825a44).fillRect(bakeryX - 4, 181, 149, 8);
    g.fillStyle(0x39777c).fillRect(bakeryX + 10, 258, 58, 54).fillRect(bakeryX + 81, 258, 49, 54);
    g.fillStyle(0xf8d991).fillRect(bakeryX + 15, 269, 48, 29);
    g.fillStyle(0x825a44).fillRect(bakeryX + 15, 294, 48, 3);
    for (let px = bakeryX + 24; px < bakeryX + 60; px += 14) g.fillStyle(0xc58938).fillEllipse(px, 288, 12, 5);
    for (let px = bakeryX; px < width; px += 18) g.fillStyle((px - bakeryX) % 36 ? 0xffebbb : 0xd37d5a).fillRect(px, 245, 18, 9);
    sign(scene, bakeryX + 72, 226, 'ПОСЛЕДНИЙ С СЫРОМ', 7);
    sign(scene, width - 180, 194, 'АЭРОПОРТ →', 10);
  } else if (stage === 1) {
    g.fillStyle(0xe0e6d4).fillRect(0, 173, 164, 139);
    g.fillStyle(0x6eb8c5).fillRect(10, 207, 143, 105);
    for (let x = 14; x < 155; x += 32) g.fillStyle(0x44656c).fillRect(x, 207, 4, 105);
    sign(scene, 83, 188, 'ВЫЛЕТ / DEPARTURES', 8);
    sign(scene, width - 165, 196, 'ПОСАДКА →\nGATE 08', 10);
    for (let x = 90; x < width; x += 435) {
      g.fillStyle(0x425e67).fillRect(x, 282, 58, 23).fillStyle(0xecbe52).fillRect(x + 3, 285, 52, 4);
      g.fillStyle(0x334a50).fillCircle(x + 10, 308, 4).fillCircle(x + 49, 308, 4);
    }
  } else {
    for (let x = 20; x < width; x += 430) {
      g.fillStyle(0x738847).fillRect(x, 308, 132, 4);
      for (let px = x; px < x + 130; px += 13) g.fillStyle(0xf5e3bc).fillRect(px, 286, 7, 26).fillTriangle(px, 286, px + 3, 281, px + 7, 286);
      g.fillStyle(0xe0c99d).fillRect(x, 299, 132, 4);
      g.fillStyle(0x7b6246).fillRect(x + 151, 284, 4, 28).fillStyle(0x466a76).fillRect(x + 143, 277, 20, 13);
      g.fillStyle(0xc36348).fillRect(x + 158, 275, 2, 9);
    }
    g.fillStyle(0xe8cc95).fillRect(width - 175, 166, 175, 146);
    plaster(g, width - 175, 166, 175, 146);
    for (let y = 178; y < 309; y += 10) g.fillStyle(0xa88863, .4).fillRect(width - 173, y, 173, 1);
    g.fillStyle(0x8b6350).fillTriangle(width - 185, 166, width - 85, 112, width + 10, 166);
    g.fillStyle(0x4c7b79).fillRect(width - 110, 250, 44, 62);
    window(g, width - 160, 240); window(g, width - 40, 240);
    g.fillStyle(0xf5e2b8).fillRect(width - 115, 246, 54, 4).fillRect(width - 115, 250, 4, 62).fillRect(width - 66, 250, 4, 62);
    g.fillStyle(0xecc77c).fillRect(width - 77, 281, 3, 7);
    sign(scene, width - 88, 215, 'ДОМ НАСТИ\nДОСТАВКА СЮДА', 9);
  }
}
