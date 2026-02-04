'use client';

import { useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
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
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Menu */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-50 w-56 md:w-64 bg-black text-white
        transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-sm tracking-wide">Menu</span>
          <button
            aria-label="메뉴 닫기"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu list */}
        <nav className="px-5 py-6">
          <ul className="space-y-4 text-sm font-light tracking-wide">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className="block hover:text-white/70"
                >
                  {item.label}
                </a>
              </li>
            ))}

            {isAuthenticated && (
              <li>
                <button
                  onClick={handleMyPageClick}
                  className="block w-full text-left hover:text-white/70"
                >
                  My Page
                </button>
              </li>
            )}

            <li>
              <button
                onClick={handleCartClick}
                className="flex items-center gap-2 hover:text-white/70"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  Cart{totalItems > 0 ? ` (${totalItems})` : ''}
                </span>
              </button>
            </li>

            <li className="pt-4 border-t border-white/10" />

            {isAuthenticated ? (
              <>
                <li>
                  <div className="space-y-1">
                    <p className="text-white/90 text-sm truncate">
                      {user?.name ?? 'User'}
                    </p>
                    <p className="text-white/50 text-xs truncate">
                      {user?.email ?? ''}
                    </p>
                  </div>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="hover:text-red-400"
                  >
                    로그아웃
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button
                  onClick={handleLoginClick}
                  className="hover:text-white/70"
                >
                  로그인
                </button>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
