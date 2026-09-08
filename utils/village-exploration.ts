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
  ctx.fillStyle = '#d7eadc';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(-cameraX, -cameraY);
  const center = worldWidth / 2;
  ctx.fillStyle = '#eaf0ef';
  ctx.fillRect(center - 110, 0, 220, 4300);
  ctx.fillRect(0, 420, worldWidth, 200);
  ctx.fillRect(0, 975, worldWidth, 100);
  ctx.fillRect(0, 1505, worldWidth, 100);
  ctx.strokeStyle = '#c4d3ce';
  ctx.lineWidth = 1;
  for (let y = Math.floor(cameraY / 48) * 48; y < cameraY + height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(center - 110, y);
    ctx.lineTo(center + 110, y);
    ctx.stroke();
  }
  // Fixed world coordinates keep scenery anchored while the camera follows players.
  for (let y = 120; y < 4300; y += 240) {
    if (y < cameraY - 100 || y > cameraY + height + 100 || (y > 350 && y < 700))
      continue;
    for (const x of [center - 550, center + 550]) {
      ctx.fillStyle = '#a8c7b4';
      ctx.fillRect(x - 42, y + 36, 96, 18);
      ctx.fillStyle = '#655c64';
      ctx.fillRect(x - 6, y + 4, 12, 40);
      ctx.fillStyle = '#43846d';
      ctx.fillRect(x - 36, y - 34, 72, 62);
      ctx.fillStyle = '#68a886';
      ctx.fillRect(x - 24, y - 50, 48, 68);
      ctx.fillStyle = '#99cba5';
      ctx.fillRect(x - 20, y - 44, 16, 12);
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
  ctx.restore();
}
