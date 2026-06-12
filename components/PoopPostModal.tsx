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

  const handleDelete = async () => {
    if (!window.confirm('정말 이 똥 기록을 치우시겠어요?')) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/community/posts/${encodeURIComponent(post.id)}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('삭제 실패');
      if (onDelete) onDelete();
      onClose();
    } catch (err) {
      setError('삭제에 실패했어요.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        disabled={submitting}
      />
      
      <div className="relative z-[101] flex max-h-[80vh] w-full max-w-[340px] flex-col overflow-hidden rounded-[1.6rem] border-4 border-[#1c445c] bg-[#f0f8ff] shadow-[0_24px_60px_rgba(28,68,92,0.3)] animate-[spring-pop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#d0e6f5] bg-[#e0f2fe] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#1c445c]">{post.authorName}님의 기록</span>
              <span className="text-[10px] text-[#4a84a6]">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-full bg-red-100 p-1.5 text-xs text-red-600 transition hover:bg-red-200"
                title="똥 치우기"
              >
                🗑️
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full bg-white p-1.5 text-[#1c445c] transition hover:bg-[#d0e6f5]"
            >
              ✕
            </button>
          </div>
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
