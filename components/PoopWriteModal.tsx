import { useState, FormEvent } from 'react';

type PoopWriteModalProps = {
  dropId: string;
  dropX: number;
  dropY: number;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PoopWriteModal({ dropId, dropX, dropY, onClose, onSuccess }: PoopWriteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요!');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payloadContent = `${content}\n\n[POS:${dropX.toFixed(2)},${dropY.toFixed(2)}]`;
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: payloadContent,
          isNotice: false
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || '기록 저장에 실패했어요.');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '기록 저장에 실패했어요.');
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
        aria-label="닫기"
      />
      
      <div className="relative z-[101] w-full max-w-[280px] animate-[spring-pop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] overflow-hidden rounded-[1.4rem] border-4 border-[#6b3512] bg-[#fffcf5] p-5 shadow-[0_24px_60px_rgba(107,53,18,0.3)]">
        <div className="mb-4 text-center">
          <span className="text-3xl leading-none">💩</span>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-[#4a240c]">
            똥에 기록 남기기
          </h2>
          <p className="mt-1 text-xs text-[#8a5b40]">
            이 자리에 영구적인 기록을 남겨보세요!
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="제목을 적어주세요!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            maxLength={60}
            className="w-full rounded-xl border-2 border-[#d9c4b6] bg-white px-3 py-2 text-sm text-[#4a240c] placeholder:text-[#b89e8f] focus:border-[#6b3512] focus:outline-none"
          />
          <textarea
            placeholder="어떤 이야기를 남길까요?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            rows={4}
            className="w-full resize-none rounded-xl border-2 border-[#d9c4b6] bg-white px-3 py-2 text-sm text-[#4a240c] placeholder:text-[#b89e8f] focus:border-[#6b3512] focus:outline-none"
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#e3d1c8] py-2.5 text-xs font-bold text-[#6b3512] transition hover:bg-[#d4bdab] active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#6b3512] py-2.5 text-xs font-bold text-white transition hover:bg-[#4a240c] active:scale-95"
            >
              {submitting ? '저장 중...' : '기록하기'}
            </button>
          </div>
        </form>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spring-pop {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
