export const DREAM_COUNT = 8;

export function dreamPoints(width: number) {
  return Array.from({ length: DREAM_COUNT }, (_, id) => ({
    id,
    x: width / 2 + Math.cos((id * Math.PI) / 4) * 230,
    y: 520 + Math.sin((id * Math.PI) / 4) * 190
  }));
}

export function readCollected(value: string | null): number[] {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(parsed)
      ? Array.from(
          new Set(
            parsed.filter(
              (id): id is number =>
                Number.isInteger(id) && id >= 0 && id < DREAM_COUNT
            )
          )
        )
      : [];
  } catch {
    return [];
  }
}

export function drawVillageGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
  worldWidth: number
) {
  ctx.fillStyle = '#bcd5b8';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(-cameraX, -cameraY);
  const center = worldWidth / 2;
  // World-anchored ground texture stays still as the camera moves.
  for (let y = Math.floor(cameraY / 32) * 32; y < cameraY + height; y += 32) {
    for (let x = Math.floor(cameraX / 32) * 32; x < cameraX + width; x += 32) {
      const seed = ((x * 17 + y * 23) >>> 0) % 101;
      ctx.fillStyle = seed % 3 ? '#a8c6a7' : '#cfe0bb';
      ctx.fillRect(x + (seed % 22), y + (seed % 17), 3, 5);
      ctx.fillRect(x + (seed % 22) + 4, y + (seed % 17) - 3, 3, 5);
    }
  }
  ctx.fillStyle = '#dce2cf';
  ctx.fillRect(center - 116, 0, 232, 1800);
  ctx.fillRect(0, 420, worldWidth, 200);
  ctx.fillRect(0, 975, worldWidth, 100);
  ctx.fillRect(0, 1505, worldWidth, 100);
  ctx.fillStyle = '#91ae9e';
  for (const y of [414, 620, 969, 1075, 1499, 1605]) {
    ctx.fillRect(0, y, center - 116, 5);
    ctx.fillRect(center + 116, y, worldWidth, 5);
  }
  ctx.strokeStyle = '#c4cdbb';
  ctx.lineWidth = 1;
  for (let y = Math.floor(cameraY / 48) * 48; y < cameraY + height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(center - 110, y);
    ctx.lineTo(center + 110, y);
    ctx.stroke();
    for (let x = Math.floor(cameraX / 64) * 64; x < cameraX + width; x += 64) {
      if (
        (y >= 420 && y < 620) ||
        (y >= 975 && y < 1075) ||
        (y >= 1505 && y < 1605)
      ) {
        ctx.strokeRect(x + (y % 96 === 0 ? 32 : 0), y, 64, 48);
      }
    }
  }
  // Fixed world coordinates keep scenery anchored while the camera follows players.
  for (let y = 120; y < 1800; y += 240) {
    if (y < cameraY - 100 || y > cameraY + height + 100 || (y > 350 && y < 700))
      continue;
    for (const x of [center - 550, center + 550]) {
      ctx.fillStyle = '#a8c7b4';
      ctx.fillRect(x - 42, y + 36, 96, 18);
      ctx.fillStyle = '#655c64';
      ctx.fillRect(x - 6, y + 4, 12, 40);
      ctx.fillStyle = '#46785f';
      ctx.fillRect(x - 40, y - 24, 80, 42);
      ctx.fillRect(x - 28, y - 44, 56, 72);
      ctx.fillStyle = y % 480 === 120 ? '#7ba27a' : '#c994a0';
      ctx.fillRect(x - 34, y - 34, 64, 40);
      ctx.fillRect(x - 18, y - 56, 38, 66);
      ctx.fillStyle = y % 480 === 120 ? '#b1c991' : '#e6bdc0';
      ctx.fillRect(x - 20, y - 44, 16, 12);
      ctx.fillRect(x + 6, y - 32, 20, 8);
    }
  }
  ctx.fillStyle = '#c5d7cf';
  ctx.fillRect(center - 92, 312, 184, 70);
  ctx.fillStyle = '#789fa4';
  ctx.fillRect(center - 84, 304, 168, 62);
  ctx.fillStyle = '#b0e1e3';
  ctx.fillRect(center - 72, 314, 144, 36);
  ctx.fillStyle = '#f5ffff';
  ctx.fillRect(center - 5, 276, 10, 55);
  ctx.fillStyle = '#cf4b63';
  for (const x of [center - 190, center + 150]) {
    ctx.fillRect(x, 680, 44, 12);
    ctx.fillRect(x + 4, 696, 6, 12);
    ctx.fillRect(x + 34, 696, 6, 12);
  }
  // Flower borders, lamp posts and patterned paving distinguish the three streets.
  for (const y of [690, 1210, 1670]) {
    for (const side of [-1, 1]) {
      const x = center + side * 342;
      ctx.fillStyle = '#8eaa8c';
      ctx.fillRect(x - 92, y, 184, 62);
      ctx.fillStyle = '#58795d';
      ctx.fillRect(x - 86, y + 6, 172, 44);
      for (let i = 0; i < 12; i++) {
        const fx = x - 77 + i * 14,
          fy = y + 14 + (i % 2) * 18;
        ctx.fillStyle = ['#e6aeaf', '#eeddb0', '#a3cbd0'][i % 3];
        ctx.fillRect(fx, fy, 8, 8);
        ctx.fillStyle = '#fff4cc';
        ctx.fillRect(fx + 3, fy + 3, 3, 3);
      }
      const lx = center + side * 144;
      ctx.fillStyle = '#365c53';
      ctx.fillRect(lx, y - 16, 6, 60);
      ctx.fillRect(lx - 6, y + 42, 18, 6);
      ctx.fillRect(lx - 8, y - 39, 22, 28);
      ctx.fillStyle = '#fae4a3';
      ctx.fillRect(lx - 4, y - 35, 14, 19);
      ctx.fillStyle = '#466a5f';
      ctx.fillRect(lx - 11, y - 43, 28, 6);
    }
  }
  ctx.fillStyle = '#88b3b6';
  ctx.fillRect(center - 59, 331, 118, 3);
  ctx.fillStyle = '#f0fcdf';
  ctx.fillRect(center - 36, 339, 48, 3);
  ctx.fillRect(center + 24, 323, 22, 3);
  ctx.restore();
}
