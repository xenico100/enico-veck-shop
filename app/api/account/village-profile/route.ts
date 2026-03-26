import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

const PALETTE_KEYS = ['amber', 'cobalt', 'crimson', 'jade', 'violet'] as const;
const PRESET_KEYS = ['archivist', 'courier', 'ghost', 'medic'] as const;

type PaletteKey = (typeof PALETTE_KEYS)[number];
type SpritePreset = (typeof PRESET_KEYS)[number];

const isPaletteKey = (value: unknown): value is PaletteKey =>
  typeof value === 'string' &&
  (PALETTE_KEYS as readonly string[]).includes(value);

const isSpritePreset = (value: unknown): value is SpritePreset =>
  typeof value === 'string' &&
  (PRESET_KEYS as readonly string[]).includes(value);

const buildDefaultProfile = (name: string) => ({
  bio: '밤에 깨어 있고, 말보다 무드를 오래 남기는 타입.',
  interests: '도트게임 / 전시 / 사운드 / 패션',
  mbti: 'INTJ',
  nickname: name,
  palette: 'crimson' as PaletteKey,
  preset: 'archivist' as SpritePreset,
  tagline: '기억 수집 중'
});

const getFallbackName = (user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) => {
  const metadata = user.user_metadata ?? {};
  const nickname =
    typeof metadata.village_nickname === 'string'
      ? metadata.village_nickname.trim()
      : '';
  const fullName =
    typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
  return nickname || fullName || name || user.email?.split('@')[0] || 'MEMBER';
};

const validatePayload = (input: Record<string, unknown>) => {
  const nickname =
    typeof input.nickname === 'string' ? input.nickname.trim() : '';
  const tagline = typeof input.tagline === 'string' ? input.tagline.trim() : '';
  const bio = typeof input.bio === 'string' ? input.bio.trim() : '';
  const interests =
    typeof input.interests === 'string' ? input.interests.trim() : '';
  const mbti =
    typeof input.mbti === 'string' ? input.mbti.trim().toUpperCase() : '';
  const palette = isPaletteKey(input.palette) ? input.palette : null;
  const preset = isSpritePreset(input.preset) ? input.preset : null;

  if (!nickname) {
    return { error: '닉네임을 입력해 주세요.' } as const;
  }
  if (nickname.length > 20) {
    return { error: '닉네임은 20자 이하로 입력해 주세요.' } as const;
  }
  if (tagline.length > 40) {
    return { error: '태그라인은 40자 이하로 입력해 주세요.' } as const;
  }
  if (bio.length > 280) {
    return { error: '메모는 280자 이하로 입력해 주세요.' } as const;
  }
  if (interests.length > 120) {
    return { error: '관심사는 120자 이하로 입력해 주세요.' } as const;
  }
  if (mbti.length > 4) {
    return { error: 'MBTI는 4자 이하로 입력해 주세요.' } as const;
  }
  if (!palette) {
    return { error: '아바타 팔레트가 올바르지 않습니다.' } as const;
  }
  if (!preset) {
    return { error: '아바타 프리셋이 올바르지 않습니다.' } as const;
  }

  return {
    value: {
      bio,
      interests,
      mbti,
      nickname,
      palette,
      preset,
      tagline
    }
  } as const;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const metadata = user.user_metadata ?? {};
  const fallbackName = getFallbackName(user);
  const defaults = buildDefaultProfile(fallbackName);

  return NextResponse.json({
    data: {
      bio:
        typeof metadata.village_bio === 'string' && metadata.village_bio.trim()
          ? metadata.village_bio.trim()
          : defaults.bio,
      interests:
        typeof metadata.village_interests === 'string' &&
        metadata.village_interests.trim()
          ? metadata.village_interests.trim()
          : defaults.interests,
      mbti:
        typeof metadata.village_mbti === 'string' &&
        metadata.village_mbti.trim()
          ? metadata.village_mbti.trim().toUpperCase()
          : defaults.mbti,
      nickname:
        typeof metadata.village_nickname === 'string' &&
        metadata.village_nickname.trim()
          ? metadata.village_nickname.trim()
          : defaults.nickname,
      palette: isPaletteKey(metadata.village_avatar_palette)
        ? metadata.village_avatar_palette
        : defaults.palette,
      preset: isSpritePreset(metadata.village_avatar_preset)
        ? metadata.village_avatar_preset
        : defaults.preset,
      tagline:
        typeof metadata.village_tagline === 'string' &&
        metadata.village_tagline.trim()
          ? metadata.village_tagline.trim()
          : defaults.tagline
    }
  });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const validated = validatePayload(body);

  if ('error' in validated) {
    return NextResponse.json({ message: validated.error }, { status: 400 });
  }

  const nextMetadata = {
    ...(user.user_metadata ?? {}),
    village_avatar_palette: validated.value.palette,
    village_avatar_preset: validated.value.preset,
    village_bio: validated.value.bio,
    village_interests: validated.value.interests,
    village_mbti: validated.value.mbti,
    village_nickname: validated.value.nickname,
    village_tagline: validated.value.tagline
  };

  const { data, error: updateError } = await supabase.auth.updateUser({
    data: nextMetadata
  });

  if (updateError) {
    return NextResponse.json(
      { message: updateError.message || '아바타 프로필 저장에 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      bio: validated.value.bio,
      interests: validated.value.interests,
      mbti: validated.value.mbti,
      nickname: validated.value.nickname,
      palette: validated.value.palette,
      preset: validated.value.preset,
      tagline: validated.value.tagline
    },
    message:
      data.user?.email != null
        ? '회원 아바타 프로필이 저장되었습니다.'
        : '아바타 프로필이 저장되었습니다.'
  });
}
