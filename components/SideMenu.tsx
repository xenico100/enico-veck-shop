'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Studio', href: '#studio' },
];



  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsMyPageOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMyPageToggle = () => {
    setIsMyPageOpen((prev) => !prev);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Side Menu */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-56 md:w-64 bg-[#0a0a0a] z-50 px-6 md:px-12 py-6 md:py-8 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-12 md:mb-16">
          <span className="text-white text-lg md:text-xl tracking-[0.2em]">ZEUS</span>
          <button
            onClick={onClose}
            className="text-white hover:opacity-80 transition-opacity"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav>
          <ul className="space-y-5 md:space-y-6">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className="text-gray-500 hover:text-white transition-colors text-sm md:text-base tracking-wide"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={handleMyPageToggle}
                className="text-gray-500 hover:text-white transition-colors text-sm md:text-base tracking-wide"
                aria-expanded={isMyPageOpen}
                aria-controls="mypage-submenu"
              >
                My Page
              </button>
              <ul
                id="mypage-submenu"
                className={`mt-3 space-y-3 pl-4 border-l border-gray-800 ${
                  isMyPageOpen ? 'block' : 'hidden'
                }`}
              >
                <li>
                  <a
                    href="#login"
                    onClick={onClose}
                    className="text-gray-500 hover:text-white transition-colors text-xs md:text-sm tracking-wide"
                  >
                    Login
                  </a>
                </li>
                <li>
                  <a
                    href="#signup"
                    onClick={onClose}
                    className="text-gray-500 hover:text-white transition-colors text-xs md:text-sm tracking-wide"
                  >
                    Sign Up
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
