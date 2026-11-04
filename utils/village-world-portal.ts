export const WORLD_PORTAL_HREF = '/world';

/** The entrance's ground position in the pixel village's world space. */
export function getVillageWorldPortal(width: number) {
  return { x: width / 2 + 120, y: 430, radius: 26 };
}
