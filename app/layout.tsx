import { Metadata } from 'next';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
// import Script from 'next/script'; // <-- 이건 이제 필요 없어서 주석 or 삭제
import Header from '@/components/Header'; // 👈 새로 만든 헤더 불러오기

/* 스타일 파일들 */
import './styles/tailwind.css';

// ... (Metadata 부분은 그대로) ...

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ko" className="no-js">
      <head>
        <link rel="stylesheet" href="/font-awesome/css/font-awesome.min.css" />
        <link rel="stylesheet" href="/micons/micons.css" />
        {/* 스크롤 부드럽게 만들기 (CSS 한 줄로 해결!) */}
        <style>{`html { scroll-behavior: smooth; }`}</style>
      </head>
      <body id="top">
        
        {/* 리액트로 만든 새 헤더 장착! */}
        <Header />

        {/* 메인 컨텐츠 */}
        {children}

        {/* 푸터는 HTML 그대로 둬도 됨 (기능이 없으니까) */}
        <footer>
           {/* ... 푸터 내용은 그대로 ... */}
        </footer>

        <Suspense>
          <Toaster />
        </Suspense>

        {/* 스크립트 태그들은 다 사라짐! 깨끗! */}
      </body>
    </html>
  );
}
