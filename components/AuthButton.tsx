// components/AuthButton.tsx
'use client';

import { useAuth } from '@/app/context/AuthContext';

// props로 온 클릭 이벤트를 받아서 실행하게 함
export default function AuthButton({
  onMyPageClick,
  onLoginClick,
}: {
  onMyPageClick?: () => void;
  onLoginClick?: () => void;
}) {
  const { user, isAuthenticated, signOut } = useAuth();
  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const pillGhostClass = `inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-medium tracking-[0.2px] text-[#f5f5f7] backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/20 hover:text-white ${appleFontClass}`;
  const pillDangerClass = `inline-flex items-center justify-center rounded-full border border-rose-300/40 bg-rose-300/10 px-4 py-2.5 text-xs font-medium tracking-[0.2px] text-rose-200 transition-colors duration-200 ease-in-out hover:bg-rose-300/20 hover:text-rose-100 ${appleFontClass}`;
  const pillPrimaryClass = `inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium tracking-[0.24px] text-black transition-colors duration-200 ease-in-out hover:bg-neutral-200 ${appleFontClass}`;

  const handleSignIn = () => onLoginClick?.();
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`mt-5 flex flex-col items-center gap-2.5 ${appleFontClass}`}>
      {isAuthenticated ? (
        <>
          <p className="mb-1 max-w-full truncate text-xs text-white/55">{user?.email}님</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* 내 정보 버튼 추가 */}
            <button onClick={onMyPageClick} className={pillGhostClass}>
              MY PAGE
            </button>
            <button onClick={handleSignOut} className={pillDangerClass}>
              LOGOUT
            </button>
          </div>
        </>
      ) : (
        <button onClick={handleSignIn} className={pillPrimaryClass}>
          LOGIN
        </button>
      )}
    </div>
  );
}
