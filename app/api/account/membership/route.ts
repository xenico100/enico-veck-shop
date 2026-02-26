import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getStudioMembershipSummaryForUser } from '@/utils/studio-membership-summary';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const membership = await getStudioMembershipSummaryForUser(user.id);
    return NextResponse.json({ data: membership });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : '멤버십 정보를 불러오지 못했습니다.'
      },
      { status: 500 }
    );
  }
}
