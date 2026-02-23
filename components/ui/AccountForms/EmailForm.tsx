'use client';

import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import { updateEmail } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EmailForm({
  userEmail
}: {
  userEmail: string | undefined;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    // Check if the new email is the same as the old email
    if (e.currentTarget.newEmail.value === userEmail) {
      e.preventDefault();
      setIsSubmitting(false);
      return;
    }
    handleRequest(e, updateEmail, router);
    setIsSubmitting(false);
  };

  return (
    <Card
      title="이메일"
      description="로그인에 사용할 이메일 주소를 입력해 주세요."
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 sm:pb-0">
            변경 확인을 위해 인증 메일을 보냅니다.
          </p>
          <Button
            variant="slim"
            type="submit"
            form="emailForm"
            loading={isSubmitting}
          >
            수정
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold">
        <form id="emailForm" onSubmit={(e) => handleSubmit(e)}>
          <input
            type="text"
            name="newEmail"
            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-base text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10 sm:w-1/2"
            defaultValue={userEmail ?? ''}
            placeholder="이메일을 입력하세요"
            maxLength={64}
          />
        </form>
      </div>
    </Card>
  );
}
