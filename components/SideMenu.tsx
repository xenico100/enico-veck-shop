'use client';

import { X, ShoppingCart, LogIn, User as UserIcon, LogOut } from 'lucide-react';
import { useEffect, useMemo } from 'react';

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

  const totalItems = 0;
  const isAuthenticated = !!auth?.isAuthenticated;
  const user = auth?.user;

  const userInitial = useMemo(() => {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    const base = name || email || '';
    return base ? base[0].toUpperCase() : 'U';
  }, [user?.name, user?.email]);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Menu */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-56 md:w-64 bg-[#0a0a0a] z-50 px-6 md:px-12 py-6 md:py-8 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center mb-12 md:mb-16">
          <span className="text-white text-lg md:text-xl tracking-[0.2em]">ZEUS</span>
          <button
            onClick={onClose}
            className="text-white hover:opacity-80 transition-opacity"
            aria-label="메뉴 닫기"
            type="button"
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

            {/* My Page (로그인 시만) */}
            {isAuthenticated && (
              <li>
                <button
                  onClick={handleMyPageClick}
                  className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm md:text-base tracking-wide w-full text-left"
                  type="button"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>My Page</span>
                </button>
              </li>
            )}

            {/* Cart */}
            <li>
              <button
                onClick={handleCartClick}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm md:text-base tracking-wide w-full text-left"
                type="button"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Cart</span>
                {totalItems > 0 && (
                  <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </li>

            {/* Divider */}
            <li className="pt-4">
              <div className="w-full h-px bg-gray-800" />
            </li>

            {/* Auth */}
            {isAuthenticated ? (
              <>
                <li>
                  <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">{userInitial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{user?.name ?? 'User'}</p>
                      <p className="text-gray-500 text-xs truncate">{user?.email ?? ''}</p>
                    </div>
                  </div>
                </li>

                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm md:text-base tracking-wide w-full text-left"
                    type="button"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button
                  onClick={handleLoginClick}
                  className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm md:text-base tracking-wide w-full text-left"
                  type="button"
                >
                  <LogIn className="w-4 h-4" />
                  <span>로그인 / 회원가입</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}
