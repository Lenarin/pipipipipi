import Phaser from 'phaser';

const palette = { ink: 0x14252d, stone: 0x405057, edge: 0xa6bcb0, wood: 0x6f6558, brass: 0xc5a56d };

function weathering(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number) {
  for (let row = 0; row < height - 4; row += 7) for (let col = 0; col < width - 6; col += 9) {
    const pattern = Math.abs(Math.floor(x * 3 + y + col * 17 + row * 23)) % 13;
    if (pattern < 4) g.fillStyle(pattern === 0 ? 0x9a8a73 : 0x1c323b, pattern === 0 ? .13 : .19)
      .fillRect(x + col, y + row, pattern === 0 ? 5 : 3, pattern % 2 + 1);
  }
  // Broken plaster islands and rain runs: irregular clusters, not a repeating tile grid.
  for (let row = 5; row < height - 8; row += 13) for (let col = 4; col < width - 10; col += 17) {
    const hash = (Math.imul(Math.floor(x + col), 73856093) ^ Math.imul(Math.floor(y + row), 19349663)) >>> 0;
    if (hash % 5 === 0) {
      const dx = x + col, dy = y + row;
      g.fillStyle(0x263b40, .28).fillRect(dx, dy, 7, 3).fillRect(dx + 2, dy - 2, 6, 2);
      g.fillStyle(0xa39275, .16).fillRect(dx + 2, dy + 3, 4, 1);
    } else if (hash % 7 === 0) {
      g.fillStyle(0x132c35, .2).fillRect(x + col, y + row, 2, Math.min(14, height - row));
      g.fillStyle(0x657d70, .13).fillRect(x + col + 2, y + row + 4, 1, 7);
    }
  }
  for (let row = 12; row < height; row += 21) {
    g.fillStyle(0x1d343d, .23).fillRect(x + 2, y + row, width - 4, 1);
    for (let col = row % 2 * 15 + 13; col < width; col += 31) g.fillRect(x + col, y + row - 11, 1, 11);
  }
}

function sign(scene: Phaser.Scene, x: number, y: number, label: string, color = '#dbbd88', size = 8) {
  return scene.add.text(x, y, label, {
    fontFamily: 'Consolas, monospace', fontSize: `${size}px`, color,
    backgroundColor: '#1b2c32', padding: { x: 5, y: 3 }, lineSpacing: 3,
  }).setOrigin(.5).setDepth(-3);
}

/** Landable ledges and their architectural support share exactly the physics coordinates. */
export function drawStructuralPlatform(scene: Phaser.Scene, cx: number, cy: number, width: number, height: number) {
  const x = cx - width / 2, top = cy - height / 2;
  const g = scene.add.graphics().setDepth(-7);
  const edge = scene.add.graphics().setDepth(1);
  if (width > 600) {
    g.setDepth(0).fillStyle(0x1d3038).fillRect(x, top, width, height);
    edge.fillStyle(0x8da79e).fillRect(x, top, width, 2);
    g.fillStyle(0x354b51).fillRect(x, top + 3, width, 5);
    for (let px = x + 9; px < x + width - 55; px += 127) {
      // Thin pools sit on the pavement; highlights never imply another landing height.
      g.fillStyle(0x182f37, .7).fillRect(px, top + 4, 43, 3).fillRect(px + 6, top + 3, 26, 1);
      g.fillStyle(0x76958e, .55).fillRect(px + 4, top + 4, 16, 1).fillRect(px + 27, top + 5, 9, 1);
    }
    for (let px = x; px < x + width; px += 28) {
      g.fillStyle(0x2c4148).fillRect(px + 1, top + 9, 25, 8);
      g.fillStyle(0x24383f).fillRect(px - 10, top + 20, 25, 11);
      g.fillStyle(0x3b5157).fillRect(px + 2, top + 9, 22, 1);
      g.fillStyle(0x142a33, .35).fillRect(px + 7, top + 14, 7, 1).fillRect(px - 3, top + 27, 5, 2);
      g.fillStyle(0x526665, .22).fillRect(px + 16, top + 12, 3, 1);
      if (px % 112 === 0) {
        g.fillStyle(0x658284, .45).fillRect(px + 4, top + 5, 42, 1);
        g.fillStyle(0xac936b, .25).fillRect(px + 6, top + 20, 31, 2);
      }
    }
    return;
  }

  if (top > 258) {
    // Low service kiosk / parked cargo cart: a first, obvious step onto the buildings.
    g.fillStyle(0x34484b).fillRect(x + 5, top + height, width - 10, 312 - top - height);
    g.fillStyle(0x687770).fillRect(x + 7, top + height + 3, width - 14, 2);
    for (let px = x + 12; px < x + width - 8; px += 11) {
      g.fillStyle(0x253b42).fillRect(px, top + height + 7, 2, 20);
      g.fillStyle(0x84917c, .3).fillRect(px + 2, top + height + 7, 1, 18);
      g.fillStyle(0xa89978, .45).fillRect(px + 5, top + height + 9, 1, 1);
    }
  } else {
    const facade = top < 170 ? 0x4b4a49 : 0x3e4b4e;
    g.fillStyle(palette.ink).fillRect(x - 3, top + height, width + 6, 312 - top - height);
    g.fillStyle(facade).fillRect(x + 3, top + height, width - 6, Math.max(8, 254 - top - height));
    weathering(g, x + 4, top + height + 1, width - 8, Math.max(8, 253 - top - height));
    // Open ground-floor arcade, a real walking passage rather than a solid painted wall.
    for (let px = x + 8; px < x + width - 28; px += 50) {
      g.fillStyle(0x697065, .38).fillCircle(px + 18, 267, 21);
      g.fillStyle(0x1a2c33).fillRect(px, 267, 36, 45);
      g.fillCircle(px + 18, 267, 18);
      g.fillStyle(0x111f29, .55).fillRect(px + 3, 269, 30, 39);
      g.fillStyle(0x273d43, .65).fillRect(px + 3, 272, 2, 33);
      g.fillStyle(0x83725a, .3).fillRect(px + 9, 292, 19, 16);
      g.fillStyle(0x10272f, .6).fillRect(px + 11, 294, 15, 13).fillRect(px + 18, 294, 1, 13);
      g.fillStyle(0x7c735e).fillRect(px - 3, 274, 3, 38);
      g.fillStyle(0x32454a).fillRect(px + 34, 274, 5, 38);
      for (let py = 277; py < 310; py += 7) g.fillStyle(0x839082, .35).fillRect(px + 34, py, 4, 1);
      g.fillStyle(0xb19566, .15).fillRect(px + 6, 308, 24, 4);
    }
    // Shutters, warm windows and exposed plaster sit behind the actor layer.
    for (let px = x + 15; px < x + width - 22; px += 43) {
      const wy = top + height + 13;
      if (wy + 28 < 253) {
        g.fillStyle(0x172b32).fillRect(px - 2, wy - 2, 26, 33);
        g.fillStyle(0x846f50).fillRect(px, wy, 22, 27);
        g.fillStyle(0xb39b68, .7).fillRect(px + 3, wy + 2, 7, 21);
        g.fillStyle(0x3f5755).fillRect(px - 5, wy, 5, 28);
        g.fillRect(px + 23, wy, 5, 28);
        g.fillStyle(0x273b3f).fillRect(px + 10, wy, 2, 27).fillRect(px, wy + 12, 22, 2);
        g.fillStyle(0xdbbb80, .25).fillRect(px + 4, wy + 3, 2, 6);
        g.fillStyle(0x20343b, .8).fillRect(px - 3, wy + 28, 30, 3);
        g.fillStyle(0x9a977e, .5).fillRect(px - 4, wy + 27, 32, 1);
        for (let py = wy + 3; py < wy + 26; py += 4) {
          g.fillStyle(0x21393e, .6).fillRect(px - 4, py, 4, 1).fillRect(px + 23, py, 4, 1);
        }
      }
      g.fillStyle(0x6d6860, .35).fillRect(px + 8, 247, 20, 3);
    }
    g.fillStyle(0x263c43).fillRect(x + width - 12, top + height, 4, 312 - top - height);
    g.fillStyle(0x6d817d).fillRect(x + width - 12, top + height, 1, 312 - top - height);
    // Wood-and-iron Georgian balcony. Rail is behind the player's silhouette.
    g.fillStyle(palette.wood).fillRect(x, top - 21, width, 3);
    g.fillStyle(0x79918b).fillRect(x + 1, top - 21, width - 2, 1);
    for (let px = x + 3; px < x + width; px += 13) {
      g.fillStyle(0x566c67).fillRect(px, top - 19, 2, 19);
      g.fillStyle(0x8c8c74, .55).fillRect(px, top - 18, 1, 3).fillRect(px, top - 5, 1, 3);
      g.lineStyle(1, 0x566c67).lineBetween(px, top - 18, px + 10, top - 2);
      g.lineStyle(1, 0x52665e).strokeRect(px + 3, top - 13, 4, 5);
    }
    // Brackets anchor the ledge to its facade.
    g.lineStyle(3, palette.wood).lineBetween(x + 6, top + height + 14, x + 22, top + height);
    g.lineBetween(x + width - 6, top + height + 14, x + width - 22, top + height);
    if (top < 170) {
      g.fillStyle(0x34474b).fillRect(cx - 18, top - 42, 35, 20);
      g.fillStyle(0x79857e).fillRect(cx - 16, top - 40, 31, 2);
      for (let py = top - 35; py < top - 25; py += 3) g.fillStyle(0x20363e).fillRect(cx - 12, py, 22, 1);
      g.lineStyle(1, 0x7a8a83).lineBetween(cx + 45, top - 22, cx + 45, top - 67).lineBetween(cx + 29, top - 57, cx + 60, top - 57);
    }
  }
  edge.fillStyle(0x20343b).fillRect(x, top, width, height);
  edge.fillStyle(palette.edge).fillRect(x, top, width, 2);
  edge.fillStyle(0x58736f).fillRect(x + 1, top + 3, width - 2, 3);
  edge.fillStyle(0x77674f).fillRect(x + 3, top + height - 4, width - 6, 3);
  for (let px = x + 4; px < x + width; px += 14) edge.fillStyle(0x9a8b6a).fillRect(px, top + height - 4, 6, 1);
}

/** Authored street furniture and location-specific visual jokes, not UI popups. */
export function decorateArchitecture(scene: Phaser.Scene, stage: number, width: number) {
  const g = scene.add.graphics().setDepth(-9);
  // Street entrance: old plaster, wooden eaves, a shut window and a small bakery.
  g.fillStyle(0x343f44).fillRect(0, 160, 164, 152);
  weathering(g, 2, 162, 160, 148);
  g.fillStyle(0x675e53).fillRect(0, 155, 170, 8);
  g.fillStyle(0x978369).fillRect(0, 155, 172, 2);
  g.fillStyle(0x24363d).fillRect(14, 179, 132, 46);
  for (let x = 22; x < 146; x += 31) {
    g.fillStyle(0x60716b).fillRect(x, 179, 23, 43);
    for (let y = 182; y < 222; y += 5) g.fillStyle(0x334b4c).fillRect(x + 2, y, 19, 2);
  }
  g.fillStyle(0x101f28).fillRect(22, 259, 128, 53);
  g.fillStyle(0xb59864).fillRect(28, 270, 49, 34);
  g.fillStyle(0x263536).fillRect(79, 260, 3, 52);
  g.fillStyle(0xc2aa78).fillRect(87, 270, 7, 2);
  g.fillStyle(0x574d3b).fillRect(30, 273, 44, 2).fillRect(30, 293, 44, 2);
  for (let px = 34; px < 72; px += 11) {
    g.fillStyle(0xe0bd7c, .5).fillEllipse(px, 290, 8, 4);
    g.fillStyle(0x6f624a, .75).fillRect(px - 2, 289, 1, 2);
  }
  g.fillStyle(0x243b3d).fillRect(50, 273, 2, 31);
  g.fillStyle(0xdec391, .2).fillRect(31, 277, 1, 10).fillRect(72, 280, 1, 12);
  g.fillStyle(0x6b6050).fillRect(20, 307, 131, 5);
  sign(scene, 84, 246, stage === 2 ? 'ПОРТ · 24/7*' : 'პური  /  ХЛЕБ', '#dcbf8b', 9);
  sign(scene, 112, 285, 'ЖИВЫМ\nВ ДОЛГ НЕ ДАЁМ', '#cbbda0', 5);

  for (let x = 190; x < width - 100; x += 470) {
    // Rain-dark electrical boxes, weeds, tipped bottles and rubbish bags.
    g.fillStyle(0x4e605e).fillRect(x, 275, 18, 37);
    g.fillStyle(0x738477).fillRect(x, 275, 18, 2);
    g.fillStyle(0x283f45).fillRect(x + 3, 280, 12, 22);
    g.lineStyle(1, 0xc4a86d).lineBetween(x + 10, 283, x + 6, 290).lineBetween(x + 6, 290, x + 11, 290).lineBetween(x + 11, 290, x + 7, 297);
    g.fillStyle(0x3b4549).fillEllipse(x + 38, 306, 22, 13);
    g.fillStyle(0x5c6866).fillRect(x + 36, 298, 5, 3);
    g.fillStyle(0x4c6c56).fillRect(x + 65, 302, 2, 10);
    g.fillRect(x + 61, 306, 8, 2);
    g.fillStyle(0x798b71).fillRect(x + 90, 308, 9, 3);
  }

  if (stage === 0) {
    sign(scene, 366, 278, 'РЕМОНТ ОБУВИ\nИ СУДЕБ', '#ceb992', 7);
    sign(scene, 710, 263, 'АРЕНДА\nДО КОНЦА СВЕТА', '#c8b28d', 7);
    sign(scene, 850, 186, 'ВИД НА МОРЕ*', '#c8bfa1', 7);
    sign(scene, 1260, 243, 'ЛИФТ НЕ РАБОТАЕТ\nДАЖЕ В АД', '#bbac8e', 6);
    sign(scene, 1450, 272, 'АПТЕКА\nПОКА ЖИВЫ', '#b2c5ae', 7);
    sign(scene, 1700, 214, 'ПОРТ  →\nЖАЛОБЫ ПРИ СЕБЕ', '#d3b97e', 8);
  } else {
    sign(scene, 380, 285, stage === 1 ? 'ТСЖ «ВЕЧНЫЙ ПОКОЙ»' : 'СМЕНА ДО ГРОБА', '#c5b087', 7);
    sign(scene, width - 260, 229, stage === 1 ? 'МОРЕ  →\nПЛАТНО С 2027' : 'ПРОХОД ПО ПРОПУСКАМ\nВОСКРЕСЕНИЕ ПО ЗАПИСИ', '#c5b087', 7);
  }
  // Loose overhead wires keep the city cohesive without covering combat space.
  g.lineStyle(1, 0x263943);
  for (let x = 160; x < width; x += 430) {
    g.lineBetween(x, 147, x + 180, 168).lineBetween(x + 180, 168, x + 410, 139);
  }
}
