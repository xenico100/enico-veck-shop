import { useState, FormEvent } from 'react';
import { useAuth } from '@/app/context/AuthContext';

type CommunityComment = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  content: string;
  comments: CommunityComment[];
  createdAt: string;
};

type PoopPostModalProps = {
  post: CommunityPost;
  onClose: () => void;
  onDelete?: () => void;
  onCommentAdded?: () => void;
};

export default function PoopPostModal({ post, onClose, onDelete, onCommentAdded }: PoopPostModalProps) {
  const auth = useAuth();
  const currentUserId = auth.user?.id;
  const isOwner = currentUserId === post.userId;

  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanContent = post.content.replace(/\[POS:\d+(?:\.\d+)?,\d+(?:\.\d+)?\]$/, '').trim();

  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!commentContent.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content: commentContent })
      });
      if (!response.ok) {
        throw new Error('댓글 저장 실패');
      }
      setCommentContent('');
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      setError('댓글 저장에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative flex w-full max-w-[20rem] flex-col overflow-hidden rounded-[1.2rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(32,18,10,0.96)] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💩</span>
            <h3 className="font-[var(--font-display-kr)] text-[1.05rem] font-bold text-[#ffebdb]">
              {post.title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-white/70 transition hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h2 className="mb-2 text-lg font-bold text-[#1c445c]">{post.title}</h2>
          <div className="whitespace-pre-wrap text-sm text-[#2a5d7c] leading-relaxed">
            {cleanContent}
          </div>

          {error && <p className="mt-4 text-xs text-red-500">{error}</p>}

          {/* Comments */}
          <div className="mt-6 border-t-2 border-dashed border-[#d0e6f5] pt-4">
            <h3 className="mb-3 text-xs font-bold text-[#4a84a6]">댓글 ({post.comments?.length || 0})</h3>
            <div className="flex flex-col gap-3">
              {post.comments?.map((comment) => (
                <div key={comment.id} className="rounded-xl bg-white p-2.5 shadow-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1c445c]">{comment.authorName}</span>
                    <span className="text-[9px] text-[#7ba5c2]">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#2a5d7c]">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comment Form */}
        <div className="border-t-2 border-[#d0e6f5] bg-[#e0f2fe] p-3">
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder={currentUserId ? "댓글 남기기..." : "로그인 후 댓글을 남길 수 있습니다."}
              disabled={!currentUserId || submitting}
              className="flex-1 rounded-xl border-2 border-white bg-white px-3 py-2 text-xs text-[#1c445c] outline-none placeholder:text-[#9abcd4] focus:border-[#4a84a6]"
            />
            <button
              type="submit"
              disabled={!currentUserId || submitting || !commentContent.trim()}
              className="rounded-xl bg-[#1c445c] px-4 text-xs font-bold text-white transition hover:bg-[#123042] disabled:opacity-50"
            >
              등록
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
