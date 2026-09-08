export const VILLAGE_BUILDING_EVENT = 'village:enter-building';
export const VILLAGE_TRAVEL_EVENT = 'village:travel';
export const VILLAGE_PAUSE_EVENT = 'village:pause';
export const villageBuildings = [
  {
    id: 'community',
    name: '똥 우체국',
    caption: '이야기 · 댓글',
    x: -350,
    y: 310,
    color: '#cb5670',
    kind: 'post'
  },
  {
    id: 'goods',
    name: '몽상 잡화점',
    caption: '의류 · 디지털 굿즈',
    x: 350,
    y: 310,
    color: '#348574',
    kind: 'shop'
  },
  {
    id: 'studio',
    name: '필름 극장',
    caption: '영상 · 작업 아카이브',
    x: -350,
    y: 890,
    color: '#7461a4',
    kind: 'cinema'
  },
  {
    id: 'profile',
    name: '주민 센터',
    caption: '내 정보 · 주문',
    x: 350,
    y: 890,
    color: '#467f9a',
    kind: 'townhall'
  },
  {
    id: 'dating',
    name: '만남의 카페',
    caption: '사람 · 대화',
    x: -350,
    y: 1420,
    color: '#bf7b3e',
    kind: 'cafe'
  },
  {
    id: 'about',
    name: '제작 연구소',
    caption: '코딩 · 미디어 · 패션',
    x: 350,
    y: 1420,
    color: '#5c8770',
    kind: 'lab'
  }
] as const;
export type VillageBuildingId = (typeof villageBuildings)[number]['id'];
export function findBuilding(id: unknown) {
  return villageBuildings.find((building) => building.id === id);
}
export function buildingDoor(id: VillageBuildingId, worldWidth: number) {
  const building = findBuilding(id)!;
  return { x: worldWidth / 2 + building.x, y: building.y + 95 };
}
