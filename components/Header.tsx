'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
    if (!isOpen) {
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
    <header>
      <div className="header-logo">
        <Link href="/" style={{display: 'block', cursor: 'pointer'}}>
           {/* 로고 영역 (비워둠) */}
        </Link>
      </div>

      <a id="header-menu-trigger" href="#0" onClick={toggleMenu} className={isOpen ? 'is-clicked' : ''}>
        <span className="header-menu-text">Menu</span>
        <span className="header-menu-icon"></span>
      </a>

      <nav id="menu-nav-wrap" className={isOpen ? 'is-visible' : ''}>
          <a href="#0" className="close-button" title="close" onClick={(e) => { e.preventDefault(); closeMenu(); }}>
            <span>Close</span>
          </a>
          <h3>ZEUS STUDIO</h3>
          <ul className="nav-list">
            {/* 👇 [수정] 링크 주소들을 섹션 ID에 맞게 정리함 */}
            <li className="current"><a href="#home" onClick={closeMenu}>Home</a></li>
            <li><a href="#about" onClick={closeMenu}>About</a></li>      {/* About 추가 */}
            <li><a href="#services" onClick={closeMenu}>Services</a></li> {/* Services 추가 */}
            <li><a href="#portfolio" onClick={closeMenu}>Studio</a></li>
            <li><a href="#contact" onClick={closeMenu}>Contact</a></li>
          </ul>
          <ul className="header-social-list">
            <li><a href="#"><i className="fa fa-facebook-square"></i></a></li>
            <li><a href="#"><i className="fa fa-twitter"></i></a></li>
            <li><a href="#"><i className="fa fa-instagram"></i></a></li>
          </ul>
      </nav>
    </header>
  );
}