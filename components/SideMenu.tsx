'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { KeyboardEvent } from 'react';

import { useAuth } from '@/app/context/AuthContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;

  // ✅ 기능 연결은 page.tsx에서 해. 없으면 그냥 닫기만 함.
  onCartClick?: () => void;
  onLoginClick?: () => void;
  onMyPageClick?: () => void;
}

const menuItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Studio', href: '#studio' },
];

export default function SideMenu({
  isOpen,
  onClose,
  onCartClick,
  onLoginClick,
  onMyPageClick,
}: SideMenuProps) {
  const auth = useAuth();

  const isAuthenticated = !!auth?.isAuthenticated;
  const user = auth?.user;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleCartClick = () => {
    onCartClick?.();
    onClose();
  };

  const handleLoginClick = () => {
    onLoginClick?.();
    onClose();
  };

  const handleMyPageClick = () => {
    onMyPageClick?.();
    onClose();
  };

  const handleLogout = async () => {
    try {
      await auth?.signOut?.();
    } finally {
      onClose();
    }
  };

  const handleKeyActivate = (event: KeyboardEvent<HTMLDivElement>, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 backdrop-blur-sm backdrop-brightness-50 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Menu */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-56 md:w-64 z-50 px-6 md:px-12 py-6 md:py-8 transition-transform duration-300 backdrop-blur-xl backdrop-brightness-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center mb-10 md:mb-12">
          <span className="text-white text-lg md:text-xl tracking-[0.2em] font-light">ZEUS</span>
          <div
            onClick={onClose}
            onKeyDown={(event) => handleKeyActivate(event, onClose)}
            role="button"
            tabIndex={0}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5" />
          </div>
        </div>

        <nav>
          <ul className="space-y-4 md:space-y-5 text-sm md:text-base font-light tracking-wide">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  {item.label}
                </a>
              </li>
            ))}

            {/* My Page (로그인 시만) */}
            {isAuthenticated && (
              <li>
                <div
                  onClick={handleMyPageClick}
                  onKeyDown={(event) => handleKeyActivate(event, handleMyPageClick)}
                  role="button"
                  tabIndex={0}
                  className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <span>My Page</span>
                </div>
              </li>
            )}

            {/* Cart */}
            <li>
              <div
                onClick={handleCartClick}
                onKeyDown={(event) => handleKeyActivate(event, handleCartClick)}
                role="button"
                tabIndex={0}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <span>Cart</span>
              </div>
            </li>

            {/* Divider */}
            <li className="pt-3">
              <span className="block text-white/15 text-xs tracking-[0.6em]">—</span>
            </li>

            {/* Auth */}
            {isAuthenticated ? (
              <>
                <li>
                  <div className="space-y-1">
                    <p className="text-white/90 text-sm truncate">{user?.name ?? 'User'}</p>
                    <p className="text-gray-500 text-xs truncate">{user?.email ?? ''}</p>
                  </div>
                </li>

                <li>
                  <div
                    onClick={handleLogout}
                    onKeyDown={(event) => handleKeyActivate(event, handleLogout)}
                    role="button"
                    tabIndex={0}
                    className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>로그아웃</span>
                  </div>
                </li>
              </>
            ) : (
              <li>
                <div
                  onClick={handleLoginClick}
                  onKeyDown={(event) => handleKeyActivate(event, handleLoginClick)}
                  role="button"
                  tabIndex={0}
                  className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  <span>로그인 / 회원가입</span>
                </div>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}
