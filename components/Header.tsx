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
            <li className="current"><a href="#home" onClick={closeMenu}>Home</a></li>
            <li><a href="#about" onClick={closeMenu}>About</a></li>
            <li><a href="#services" onClick={closeMenu}>Services</a></li>
            <li><a href="#portfolio" onClick={closeMenu}>Studio</a></li>
            <li><a href="#contact" onClick={closeMenu}>Contact</a></li>
          </ul>

          {/* 🔥 로그인 버튼 추가된 부분! */}
          <div className="header-auth-section" style={{ margin: '30px 0', textAlign: 'center' }}>
             <p style={{fontSize: '12px', color: '#555', marginBottom: '10px', letterSpacing: '2px'}}>MEMBER ACCESS</p>
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