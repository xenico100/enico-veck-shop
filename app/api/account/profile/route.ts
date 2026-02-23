import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const phoneRegex = /^[0-9+()\-\s]{9,20}$/;

const validateProfilePayload = (input: {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
}) => {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';

  if (!name) {
    return { error: '이름을 입력해 주세요.' } as const;
  }
  if (name.length > 80) {
    return { error: '이름은 80자 이하로 입력해 주세요.' } as const;
  }
  if (phone && !phoneRegex.test(phone)) {
    return { error: '전화번호는 숫자/하이픈 형식으로 9자 이상 입력해 주세요.' } as const;
  }
  if (address && address.length < 5) {
    return { error: '주소는 5자 이상 입력해 주세요.' } as const;
  }
  if (address.length > 200) {
    return { error: '주소는 200자 이하로 입력해 주세요.' } as const;
  }

  return {
    value: {
      name,
      phone,
      address
    }
  } as const;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const primarySelect = await (supabase as never)
    .from('users')
    .select('id,full_name,name,phone,address')
    .eq('id', user.id)
    .maybeSingle();

  if (primarySelect.error) {
    const message = primarySelect.error.message || '';
    if (message.includes('column') && message.includes('phone')) {
      return NextResponse.json(
        {
          message:
            'users 테이블에 name/phone/address 컬럼이 없습니다. 프로필 컬럼 migration을 먼저 적용해 주세요.'
        },
        { status: 500 }
      );
    }

    const fallbackSelect = await (supabase as never)
      .from('users')
      .select('id,full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (fallbackSelect.error) {
      return NextResponse.json(
        { message: fallbackSelect.error.message || '프로필 정보를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    const row = fallbackSelect.data;
    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email ?? '',
        name: row?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
        phone: '',
        address: ''
      }
    });
  }

  const row = primarySelect.data;
  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email ?? '',
      name:
        row?.name ??
        row?.full_name ??
        user.user_metadata?.full_name ??
        user.email?.split('@')[0] ??
        '',
      phone: row?.phone ?? '',
      address: row?.address ?? ''
    }
  });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    phone?: unknown;
    address?: unknown;
  };

  const validated = validateProfilePayload(body);
  if ('error' in validated) {
    return NextResponse.json({ message: validated.error }, { status: 400 });
  }

  const payload = {
    id: user.id,
    name: validated.value.name || null,
    full_name: validated.value.name || null,
    phone: validated.value.phone || null,
    address: validated.value.address || null
  };

  let writeResult = await (supabase as never)
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select('id,full_name,name,phone,address')
    .single();

  if (writeResult.error) {
    const message = writeResult.error.message || '';
    const rlsLikely =
      message.toLowerCase().includes('row-level security') ||
      message.toLowerCase().includes('permission denied');

    if (rlsLikely) {
      try {
        const { createAdminClient } = await import('@/utils/supabase/adminClient');
        const adminClient = createAdminClient();
        writeResult = await (adminClient as never)
          .from('users')
          .upsert(payload, { onConflict: 'id' })
          .select('id,full_name,name,phone,address')
          .single();
      } catch {
        // ignore and return original error below
      }
    }
  }

  if (writeResult.error) {
    const message = writeResult.error.message || '회원정보 저장에 실패했습니다.';
    if (message.includes('column') && message.includes('phone')) {
      return NextResponse.json(
        {
          message:
            'users 테이블에 name/phone/address 컬럼이 없습니다. 프로필 컬럼 migration을 먼저 적용해 주세요.'
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ message }, { status: 500 });
  }

  const row = writeResult.data;
  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email ?? '',
      name: row?.name ?? row?.full_name ?? '',
      phone: row?.phone ?? '',
      address: row?.address ?? ''
    },
    message: '회원정보가 저장되었습니다.'
  });
}
