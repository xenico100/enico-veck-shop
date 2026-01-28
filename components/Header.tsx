'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthButton from './AuthButton'; // 👈 아까 만든 로그인 버튼 가져오기

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const newState = !isOpen;
    setIsOpen(newState);
    
    // 원본 CSS 애니메이션을 위해 body 클래스 제어
    if (newState) {
      document.body.classList.add('menu-is-open');
    } else {
      document.body.classList.remove('menu-is-open');
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    document.body.classList.remove('menu-is-open');
  };

  return (
    <header className="s-header"> {/* s-header 클래스 명시 (원본 CSS 적용) */}
      
      {/* 1. 로고 영역 */}
      <div className="header-logo">
        <Link href="/" className="site-logo">
           <img src="/images/logo.png" alt="Homepage" />
        </Link>
      </div>

      {/* 2. 메뉴 토글 버튼 (햄버거) */}
      <a id="header-menu-trigger" href="#0" onClick={toggleMenu} className={isOpen ? 'is-clicked' : ''}>
        <span className="header-menu-text">Menu</span>
        <span className="header-menu-icon"></span>
      </a>

      {/* 3. 네비게이션 메뉴 영역 */}
      <nav id="menu-nav-wrap" className={isOpen ? 'is-visible' : ''}>
          
          {/* 닫기 버튼 */}
          <a href="#0" className="close-button" title="close" onClick={(e) => { e.preventDefault(); closeMenu(); }}>
            <span>Close</span>
          </a>

          <h3>ZEUS STUDIO</h3>
          
          <ul className="nav-list">
            <li className="current">
              <Link href="/#home" onClick={closeMenu}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/#about" onClick={closeMenu}>
                About
              </Link>
            </li>
            <li>
              <Link href="/#services" onClick={closeMenu}>
                Services
              </Link>
            </li>
            <li>
              <Link href="/#portfolio" onClick={closeMenu}>
                Studio
              </Link>
            </li>
            <li>
              <Link href="/#posts" onClick={closeMenu}>
                Posts
              </Link>
            </li>
            <li>
              <Link href="/#contact" onClick={closeMenu}>
                Contact
              </Link>
            </li>
          </ul>

          {/* 🔥 로그인 버튼 추가된 부분! */}
          <div className="header-auth-section flex flex-col items-center justify-center gap-2 text-center">
             <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">Member Access</p>
             <AuthButton />
          </div>

          <ul className="header-social-list">
            <li><a href="#"><i className="fa fa-facebook-square"></i></a></li>
            <li><a href="#"><i className="fa fa-twitter"></i></a></li>
            <li><a href="#"><i className="fa fa-instagram"></i></a></li>
          </ul>

      </nav>
    </header>
  );
}
