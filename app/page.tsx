import App from '@/assets/figma/src/app/App';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  let user: { id?: string; email?: string | null } | null = null;
  let posts:
    | Array<{
        id: string;
        title: string;
        content: string;
        created_at: string;
        user_id: string;
      }>
    | null = null;
  let studioPosts:
    | Array<{
        id: string;
      title: string;
      content: string;
        image_url: string | null;
      created_at: string;
      user_id: string;
    }>
    | null = null;

  if (isSupabaseConfigured) {
    const supabase = createClient();
    const {
      data: { user: authUser }
    } = await supabase.auth.getUser();
    user = authUser;

    const { data } = await supabase
      .from('studio_posts' as never)
      .select('id,title,content,created_at,user_id')
      .order('created_at', { ascending: false });
    posts = data as typeof posts;

    const { data: studioData } = await supabase
      .from('studio_posts' as never)
      .select('id,title,content,image_url,created_at,user_id')
      .order('created_at', { ascending: false });
    studioPosts = studioData as typeof studioPosts;
  }

  return (
    <App
      isAuthenticated={Boolean(user?.id)}
      userEmail={user?.email ?? null}
      posts={posts ?? []}
      studioPosts={studioPosts ?? []}
    />
  );
}
