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
  const [anonymousName, setAnonymousName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanContent = post.content.replace(/\[POS:\d+(?:\.\d+)?,\d+(?:\.\d+)?\]$/, '').trim();

  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!commentContent.trim()) return;
    if (!currentUserId && !anonymousName.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId: post.id, 
          content: commentContent,
          anonymousName: !currentUserId ? anonymousName.trim() : undefined
        })
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
      
      <div className="relative flex w-full max-w-[22rem] flex-col overflow-hidden rounded-[0.8rem] border border-[rgba(255,255,255,0.12)] bg-[#f5f5f5] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ddd] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💩</span>
            <h3 className="text-[1rem] font-bold text-[#333]">
              {post.title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center text-[#999] transition hover:text-[#333]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-white custom-scrollbar">
          <h2 className="mb-2 text-lg font-bold text-[#222]">{post.title}</h2>
          <div className="whitespace-pre-wrap text-[0.85rem] text-[#444] leading-relaxed">
            {cleanContent}
          </div>

          {error && <p className="mt-4 text-xs font-semibold text-red-500">{error}</p>}

          {/* Comments */}
          <div className="mt-6 pt-4 border-t border-[#eee]">
            <h3 className="mb-3 text-[0.8rem] font-bold text-[#666]">댓글 <span className="text-[#d31900]">{post.comments?.length || 0}</span></h3>
            <div className="flex flex-col border-t border-[#ddd]">
              {post.comments?.map((comment) => (
                <div key={comment.id} className="border-b border-[#eee] py-3 px-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[0.75rem] font-bold text-[#333]">
                      {(comment as any).anonymous_name || comment.authorName || 'ㅇㅇ'}
                    </span>
                    <span className="text-[0.65rem] text-[#999]">
                      {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[0.8rem] text-[#444]">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comment Form */}
        <div className="border-t border-[#ddd] bg-[#fdfdfd] p-3">
          <form onSubmit={handleComment} className="flex flex-col gap-2">
            {!currentUserId && (
              <input
                type="text"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                placeholder="닉네임 (ㅇㅇ)"
                maxLength={20}
                disabled={submitting}
                className="w-1/3 min-w-[100px] rounded border border-[#ccc] bg-white px-2 py-1.5 text-[0.75rem] text-[#333] outline-none focus:border-[#888]"
              />
            )}
            <div className="flex gap-2">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="댓글을 남겨보세요."
                disabled={submitting}
                rows={2}
                className="flex-1 resize-none rounded border border-[#ccc] bg-white px-3 py-2 text-[0.8rem] text-[#333] outline-none focus:border-[#888]"
              />
              <button
                type="submit"
                disabled={submitting || !commentContent.trim() || (!currentUserId && !anonymousName.trim())}
                className="rounded bg-[#3b4890] px-4 text-[0.8rem] font-bold text-white transition hover:bg-[#2c3670] disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
