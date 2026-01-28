import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types_db';

type PostPayload = {
  title?: string;
  content?: string;
};

export async function POST(request: Request) {
  const { title, content } = (await request.json()) as PostPayload;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { message: '제목과 내용을 모두 입력해 주세요.' },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options });
        }
      }
    }
  );

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  const { error: insertError } = await (supabase as never)
    .from('posts')
    .insert({
      title: title.trim(),
      content: content.trim(),
      user_id: user.id
    });

  if (insertError) {
    return NextResponse.json(
      { message: '게시글 저장에 실패했습니다.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
