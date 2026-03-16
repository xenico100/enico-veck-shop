import { MarkerType } from '@xyflow/react';

import type {
  ArchitectureAccent,
  ArchitectureFlowKind,
  ArchitectureGraphEdge,
  ArchitectureGraphNode,
  ArchitectureSystemNode,
  ArchitectureZoneNode
} from '@/components/architecture/graph-types';
import { getAccentMeta } from '@/components/architecture/graph-types';

/**
 * real_enico 아키텍처 맵은 아래 실제 저장소 분석을 기준으로 구성했다.
 *
 * Confirmed files:
 * - README.md
 * - next.config.ts
 * - vercel.json
 * - src/app/page.tsx
 * - src/app/admin/page.tsx
 * - src/lib/storefront/server.ts
 * - src/lib/storefront/productCatalog.ts
 * - src/lib/r2Storage.ts
 * - src/app/api/admin/r2-upload/route.ts
 * - src/app/api/admin/migrate-images-to-r2/route.ts
 * - tools/sync-upload-to-supabase.mjs
 *
 * Confirmed folders:
 * - src
 * - public
 * - sql
 * - supabase
 * - tools
 * - upload
 *
 * Notes:
 * - "레거시 Supabase Storage URL"과 일부 관리 플로우는 마이그레이션 코드 기준의
 *   보수적 추론을 포함한다.
 * - 전체 시각화는 xenico100/real_enico 저장소를 2026-03-16 기준으로 분석해
 *   수동 배치한 노드 데이터다.
 */

function zone(
  id: string,
  title: string,
  subtitle: string,
  accent: ArchitectureAccent,
  position: { x: number; y: number },
  size: { width: number; height: number }
): ArchitectureZoneNode {
  return {
    id,
    type: 'architectureZone',
    position,
    data: {
      title,
      subtitle,
      accent
    },
    selectable: false,
    draggable: false,
    connectable: false,
    focusable: false,
    zIndex: 0,
    style: size
  };
}

function node(
  id: string,
  title: string,
  subtitle: string,
  accent: ArchitectureAccent,
  position: { x: number; y: number },
  options?: Omit<ArchitectureSystemNode['data'], 'title' | 'subtitle' | 'accent'>
): ArchitectureSystemNode {
  return {
    id,
    type: 'architectureNode',
    position,
    data: {
      title,
      subtitle,
      accent,
      ...options
    }
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  label: string,
  flow: ArchitectureFlowKind,
  handles?: {
    sourceHandle?: string;
    targetHandle?: string;
  }
): ArchitectureGraphEdge {
  return {
    id,
    source,
    target,
    type: 'architectureEdge',
    data: {
      label,
      flow
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: getAccentMeta(flow).color
    },
    ...handles
  };
}

export const architectureNodes: ArchitectureGraphNode[] = [
  zone(
    'zone-runtime',
    '런타임 / 배포 레이어',
    '사용자 요청이 브라우저, Vercel, Next.js App Router를 거쳐 렌더링으로 이어지는 구간',
    'runtime',
    { x: 40, y: 40 },
    { width: 1050, height: 500 }
  ),
  zone(
    'zone-data',
    '데이터 / 카탈로그 레이어',
    'Supabase 조회, 상품/컬렉션 테이블, 카탈로그 정규화 흐름',
    'data',
    { x: 1130, y: 40 },
    { width: 710, height: 500 }
  ),
  zone(
    'zone-admin',
    '관리 / 이관 레이어',
    '관리자 콘솔, R2 업로드, SmartStore 가져오기, 레거시 마이그레이션 구간',
    'admin',
    { x: 40, y: 580 },
    { width: 1050, height: 420 }
  ),
  zone(
    'zone-assets',
    '이미지 / 저장소 레이어',
    'Cloudflare R2 퍼블릭 URL과 과거 Supabase Storage URL 이관 흐름',
    'image',
    { x: 1130, y: 580 },
    { width: 710, height: 420 }
  ),
  zone(
    'zone-source',
    '개발 소스 구조',
    '저장소 폴더 기준으로 런타임 코드, 로컬 스크립트, 업로드 원본의 위치를 보여주는 구간',
    'source',
    { x: 40, y: 1040 },
    { width: 1800, height: 260 }
  ),
  node('user', '사용자', 'Request Origin', 'runtime', { x: 110, y: 160 }, {
    detail: '페이지 탐색과 상품 열람 요청의 시작점'
  }),
  node('browser', '브라우저 요청', 'Browser / Network', 'runtime', { x: 110, y: 330 }, {
    detail: 'HTML, JSON, 이미지 자산을 받아 실제 화면을 렌더링'
  }),
  node('vercel', 'Vercel 배포', 'vercel.json', 'runtime', { x: 400, y: 160 }, {
    path: 'vercel.json',
    detail: '실제 배포 및 런타임 진입점. 크론 정의도 이 레이어에 포함'
  }),
  node('next-site', 'Next.js 웹사이트', 'App Router', 'runtime', { x: 700, y: 150 }, {
    path: 'src/app/page.tsx',
    detail: '홈 진입점에서 상품/컬렉션 데이터를 받아 App으로 전달'
  }),
  node('app-router', 'App Router / 서버 렌더', 'Page + Layout', 'runtime', { x: 700, y: 340 }, {
    path: 'src/app/page.tsx + src/app/layout.tsx',
    detail: '페이지 요청마다 카탈로그와 초기 UI를 조합'
  }),
  node('image-render', '이미지 렌더링', 'next.config.ts / remotePatterns', 'image', { x: 700, y: 520 }, {
    path: 'next.config.ts',
    detail: 'R2와 Supabase 호스트를 허용한 원격 이미지 렌더 구간'
  }),
  node('storefront-server', '스토어프론트 서버', 'unstable_cache', 'data', { x: 1180, y: 150 }, {
    path: 'src/lib/storefront/server.ts',
    detail: 'published 상품/컬렉션 조회를 캐시하며 SSR에 전달'
  }),
  node('supabase', 'Supabase DB/Auth', 'Primary Backend', 'data', { x: 1180, y: 350 }, {
    path: 'products / collections / auth',
    detail: '행 조회, 관리자 확인, 메타데이터 저장을 담당'
  }),
  node('products', 'products 테이블', 'Product Rows', 'data', { x: 1490, y: 110 }, {
    path: 'products.images / thumbnail_url',
    detail: '상품 텍스트와 이미지 URL이 보관되는 핵심 테이블'
  }),
  node('collections', 'collections 테이블', 'Collection Rows', 'data', { x: 1490, y: 300 }, {
    path: 'collections.image / images',
    detail: '컬렉션 메인 이미지와 배열 URL이 저장됨'
  }),
  node('catalog', '상품 데이터', 'Catalog Normalizer', 'data', { x: 1490, y: 500 }, {
    path: 'src/lib/storefront/productCatalog.ts',
    detail: '조회한 행을 실제 페이지에서 쓰는 카탈로그 구조로 정리'
  }),
  node('admin-console', '관리자 콘솔', 'Product Metadata Editor', 'admin', { x: 100, y: 680 }, {
    path: 'src/app/admin/page.tsx',
    detail: '상품 텍스트, 공개 여부, 이미지 URL 메타데이터를 수정'
  }),
  node('admin-upload', '관리자 업로드 API', 'R2 Upload Route', 'admin', { x: 410, y: 660 }, {
    path: 'src/app/api/admin/r2-upload/route.ts',
    detail: '관리자 토큰을 확인한 뒤 업로드 파일을 R2 퍼블릭 URL로 변환'
  }),
  node('migrate', '이미지 마이그레이션 API', 'Legacy URL -> R2', 'admin', { x: 740, y: 660 }, {
    path: 'src/app/api/admin/migrate-images-to-r2/route.ts',
    detail: '과거 Supabase Storage URL을 스캔해 새 R2 URL로 재기록'
  }),
  node('smartstore', 'SmartStore 가져오기', 'Import Pipeline', 'admin', { x: 100, y: 860 }, {
    path: 'src/lib/smartstoreImport.ts',
    detail: '외부 상품 정보를 Supabase rows로 가져오는 별도 파이프라인'
  }),
  node('upload-sync', '로컬 upload 동기화', 'Legacy CLI Script', 'admin', { x: 410, y: 860 }, {
    path: 'tools/sync-upload-to-supabase.mjs',
    detail: 'upload 폴더를 스캔해 과거 저장 경로와 상품 URL을 동기화'
  }),
  node('r2', 'Cloudflare R2 이미지 저장소', 'Bucket: product-images', 'image', { x: 1280, y: 710 }, {
    path: 'src/lib/r2Storage.ts',
    detail: 'S3 호환 서명 PUT으로 업로드하고 퍼블릭 URL을 반환'
  }),
  node('legacy-storage', '레거시 Supabase Storage URL', 'Migration Source', 'image', { x: 1570, y: 830 }, {
    detail: '마이그레이션 코드가 직접 읽어오는 과거 public object URL들',
    status: '보수적 추론'
  }),
  node('src-folder', 'src', 'App / lib / API', 'source', { x: 110, y: 1120 }, {
    detail: 'Next.js 앱, 스토어프론트 로직, 관리자 API의 본체'
  }),
  node('public-folder', 'public', 'Static Assets', 'source', { x: 420, y: 1120 }, {
    detail: '정적 자산과 기본 프론트 리소스 위치'
  }),
  node('sql-folder', 'sql', 'Schema Notes', 'source', { x: 730, y: 1120 }, {
    detail: '보조 SQL 파일과 쿼리 자료 위치'
  }),
  node('supabase-folder', 'supabase', 'Local DB Config', 'source', { x: 1040, y: 1120 }, {
    detail: 'Supabase 로컬 설정과 마이그레이션 자산 위치'
  }),
  node('tools-folder', 'tools', 'CLI / Import Scripts', 'source', { x: 1350, y: 1120 }, {
    detail: 'SmartStore 수집기와 업로드 동기화 스크립트 모음'
  }),
  node('upload-folder', 'upload', '원본 이미지 폴더', 'source', { x: 1660, y: 1120 }, {
    path: 'upload/자켓, 셔츠, 팬츠...',
    detail: '카테고리별 실물 이미지 원본이 정리된 로컬 폴더'
  })
];

export const architectureEdges: ArchitectureGraphEdge[] = [
  edge('edge-user-browser', 'user', 'browser', '탐색', 'runtime', {
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target'
  }),
  edge('edge-browser-vercel', 'browser', 'vercel', 'HTTPS 요청', 'runtime', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-vercel-next', 'vercel', 'next-site', '배포 런타임', 'runtime', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-next-router', 'next-site', 'app-router', 'page 조립', 'runtime', {
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target'
  }),
  edge('edge-router-storefront', 'app-router', 'storefront-server', 'SSR 조회', 'runtime', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-storefront-supabase', 'storefront-server', 'supabase', 'select', 'data', {
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target'
  }),
  edge('edge-supabase-products', 'supabase', 'products', 'products', 'data', {
    sourceHandle: 'top-source',
    targetHandle: 'left-target'
  }),
  edge('edge-supabase-collections', 'supabase', 'collections', 'collections', 'data', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-products-catalog', 'products', 'catalog', '상품 rows', 'data', {
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target'
  }),
  edge('edge-collections-catalog', 'collections', 'catalog', '컬렉션 rows', 'data', {
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target'
  }),
  edge('edge-catalog-router', 'catalog', 'app-router', '초기 데이터', 'data', {
    sourceHandle: 'left-source',
    targetHandle: 'right-target'
  }),
  edge('edge-next-image-render', 'app-router', 'image-render', 'Next/Image', 'runtime', {
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target'
  }),
  edge('edge-r2-image-render', 'r2', 'image-render', 'R2 asset', 'image', {
    sourceHandle: 'left-source',
    targetHandle: 'right-target'
  }),
  edge('edge-image-browser', 'image-render', 'browser', '렌더 결과', 'image', {
    sourceHandle: 'left-source',
    targetHandle: 'right-target'
  }),
  edge('edge-admin-console-upload', 'admin-console', 'admin-upload', '파일 전송', 'admin', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-admin-console-supabase', 'admin-console', 'supabase', '상품 메타 갱신', 'admin', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-upload-auth', 'admin-upload', 'supabase', '관리자 토큰 확인', 'admin', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-upload-r2', 'admin-upload', 'r2', 'PUT 업로드', 'image', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-upload-supabase', 'admin-upload', 'supabase', 'URL 연결', 'admin', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-migrate-legacy', 'migrate', 'legacy-storage', '기존 URL 읽기', 'admin', {
    sourceHandle: 'right-source',
    targetHandle: 'top-target'
  }),
  edge('edge-migrate-r2', 'migrate', 'r2', '재업로드', 'image', {
    sourceHandle: 'right-source',
    targetHandle: 'top-target'
  }),
  edge('edge-migrate-supabase', 'migrate', 'supabase', 'URL 재기록', 'admin', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-smartstore-supabase', 'smartstore', 'supabase', 'rows upsert', 'admin', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-upload-sync-legacy', 'upload-sync', 'legacy-storage', '과거 경로 반영', 'image', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-upload-sync-supabase', 'upload-sync', 'supabase', '이미지 URL 저장', 'admin', {
    sourceHandle: 'right-source',
    targetHandle: 'left-target'
  }),
  edge('edge-src-next', 'src-folder', 'next-site', '앱 코드', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-src-api', 'src-folder', 'admin-upload', 'API 구현', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-src-migrate', 'src-folder', 'migrate', '이관 로직', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-src-smartstore', 'src-folder', 'smartstore', 'import 로직', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-public-browser', 'public-folder', 'browser', '정적 자산', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-sql-supabase', 'sql-folder', 'supabase', '쿼리 자료', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-supabase-folder-supabase', 'supabase-folder', 'supabase', '로컬 설정', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-tools-smartstore', 'tools-folder', 'smartstore', 'CLI 스크립트', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-tools-upload-sync', 'tools-folder', 'upload-sync', '동기화 스크립트', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  }),
  edge('edge-upload-folder-upload-sync', 'upload-folder', 'upload-sync', '원본 스캔', 'source', {
    sourceHandle: 'top-source',
    targetHandle: 'bottom-target'
  })
];
