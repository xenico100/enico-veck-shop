import 'server-only';

import { createClient } from '@/utils/supabase/server';
import {
  decideWorldOwnerAccess,
  parseWorldOwnerUserId
} from '@/utils/world-owner-policy';
import type {
  WorldWorkshopErrorCode,
  WorldWorkshopResponse
} from '@/utils/world-workshop';

type WorkshopResult = {
  status: 200 | 401 | 403 | 503;
  body: WorldWorkshopResponse;
};

function denied(
  status: 401 | 403 | 503,
  code: WorldWorkshopErrorCode,
  message: string
): WorkshopResult {
  return { status, body: { code, message } };
}

function unavailable(): WorkshopResult {
  // Never echo configuration, Auth errors, user identity, or private paths.
  return denied(
    503,
    'WORKSHOP_UNAVAILABLE',
    '작업실을 아직 사용할 수 없습니다.'
  );
}

function unauthenticated(): WorkshopResult {
  return denied(401, 'NOT_AUTHENTICATED', '소유자 계정으로 로그인해 주세요.');
}

export function validateWorldWorkshopDriveUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'drive.google.com' ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const folder = /^\/drive\/(?:u\/\d+\/)?folders\/[A-Za-z0-9_-]+\/?$/;
    const file = /^\/file\/d\/[A-Za-z0-9_-]+(?:\/view)?\/?$/;
    if (!folder.test(url.pathname) && !file.test(url.pathname)) return null;

    // Omit tracking, fragments and any query credentials from the response.
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

export async function readOwnerWorkshop(): Promise<WorkshopResult> {
  const ownerId = process.env.WORLD_OWNER_USER_ID;
  if (
    !parseWorldOwnerUserId(ownerId) ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return unavailable();
  }

  try {
    // Always verify against Auth for this request. Cookie contents, getSession(),
    // client state, email and the site's broader manager policy are not authority.
    const {
      data: { user },
      error
    } = await createClient().auth.getUser();

    if (error) {
      if (
        error.name === 'AuthSessionMissingError' ||
        error.status === 400 ||
        error.status === 401 ||
        error.status === 403
      ) {
        return unauthenticated();
      }
      return unavailable();
    }

    const decision = decideWorldOwnerAccess(user, ownerId);
    if (!decision.allowed) {
      if (decision.reason === 'unauthenticated') return unauthenticated();
      if (decision.reason === 'unavailable') return unavailable();
      return denied(403, 'OWNER_ONLY', '소유자만 작업실을 열 수 있습니다.');
    }

    // Private configuration is read only after authorization. This is a link,
    // not evidence that a backup or a restore has happened.
    const driveUrl = validateWorldWorkshopDriveUrl(
      process.env.WORLD_WORKSHOP_DRIVE_URL
    );

    return {
      status: 200,
      body: {
        data: {
          isSample: true,
          title: 'dot 작업실 · 샘플',
          notice:
            '화면 검증용 샘플입니다. 실제 제작·백업·복원 검증 상태는 모두 미확인이며 연결된 상태 원천이 없습니다.',
          latestPreview: { url: '/world', label: '현재 로컬 시제품' },
          version: 'prototype-0.2 · 샘플 버전',
          stages: [
            {
              id: 'making',
              label: '제작 중',
              demoStatus: 'in-progress',
              actualStatus: 'unknown'
            },
            {
              id: 'backed-up',
              label: '백업 완료',
              demoStatus: 'complete',
              actualStatus: 'unknown'
            },
            {
              id: 'restore-verified',
              label: '복원 검증 완료',
              demoStatus: 'complete',
              actualStatus: 'unknown'
            }
          ],
          lastVerifiedAt: null,
          driveUrl
        }
      }
    };
  } catch {
    return unavailable();
  }
}
