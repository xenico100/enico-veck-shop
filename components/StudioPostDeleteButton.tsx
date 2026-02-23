'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toasts/use-toast';
import {
  deleteStudioPost,
  type StudioPostDeleteState
} from '@/app/posts/actions';

type Props = {
  postId: string;
  className?: string;
  children?: React.ReactNode;
};

const initialState: StudioPostDeleteState = { status: 'idle' };

function SubmitButton({
  className,
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? '삭제 중...' : children ?? '삭제'}
    </button>
  );
}

export default function StudioPostDeleteButton({
  postId,
  className,
  children
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction] = useFormState(deleteStudioPost, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({
        title: '삭제 완료',
        description: '게시물이 삭제되었습니다.'
      });
      router.push('/posts');
      router.refresh();
    }

    if (state.status === 'error' && state.message) {
      toast({
        title: '삭제 실패',
        description: state.message
      });
    }
  }, [router, state, toast]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm('게시물을 삭제할까요?')) {
          event.preventDefault();
        }
      }}
      className="contents"
    >
      <input type="hidden" name="postId" value={postId} />
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
