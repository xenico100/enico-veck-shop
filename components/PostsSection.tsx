import { BRAND_NAME } from '@/utils/branding';

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
};

type PostsSectionProps = {
  isAuthenticated: boolean;
  userEmail: string | null;
  posts: Post[];
};

export default function PostsSection({
  isAuthenticated: _isAuthenticated,
  userEmail: _userEmail,
  posts: _posts
}: PostsSectionProps) {
  return (
    <section
      id="posts"
      className="bg-gradient-to-b from-black via-neutral-950 to-black px-4 py-16"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">
                Community
              </p>
              <h2 className="text-3xl font-semibold text-white md:text-4xl">
                {BRAND_NAME} 게시판
              </h2>
              <p className="text-base text-neutral-300">
                작업 후기와 문의를 남겨주세요. 로그인한 사용자만 글쓰기가
                가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
