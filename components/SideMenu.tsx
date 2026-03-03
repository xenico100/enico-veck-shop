'use client';

import { useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';

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
  { label: 'Community', href: '#community' },
];

export default function SideMenu({
  isOpen,
  onClose,
  onCartClick,
  onLoginClick,
  onMyPageClick,
}: SideMenuProps) {
  const auth = useAuth();
  const { itemCount } = useCart();

  const totalItems = itemCount;
  const isAuthenticated = !!auth?.isAuthenticated;
  const user = auth?.user;
  const appleFontClass = `[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]`;
  const navItemClass = [
    'block w-full text-left no-underline',
    'text-[#f5f5f7] opacity-80 hover:opacity-100 hover:text-white',
    'transition-colors duration-200 ease-in-out',
    'text-[19px] font-medium leading-7 [letter-spacing:0.28px]',
    appleFontClass
  ].join(' ');
  const pillButtonClass = [
    'flex w-full items-center justify-start gap-2 rounded-full',
    'border border-white/[0.15] bg-white/[0.08] px-4 py-2.5',
    'text-left no-underline text-[#f5f5f7] opacity-90',
    'hover:opacity-100 hover:text-white hover:bg-white/[0.12]',
    'transition-colors duration-200 ease-in-out backdrop-blur-md',
    'text-[18px] font-medium [letter-spacing:0.24px]',
    appleFontClass
  ].join(' ');
  const menuActionPillClass = [
    'flex w-full items-center justify-center rounded-full',
    'border border-white/[0.15] bg-white/[0.10] px-4 py-3',
    'text-base font-medium tracking-[0.2px] text-white/85',
    'backdrop-blur-md transition-colors duration-200 ease-in-out',
    'hover:bg-white/[0.20] hover:text-white',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
    appleFontClass
  ].join(' ');
  const menuActionPrimaryPillClass = [
    'flex w-full items-center justify-center rounded-full',
    'border border-white/[0.20] bg-white/[0.15] px-4 py-3',
    'text-base font-medium tracking-[0.2px] text-white',
    'backdrop-blur-md transition-colors duration-200 ease-in-out',
    'hover:bg-white/[0.22]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
    appleFontClass
  ].join(' ');
  const menuDangerPillClass = [
    'flex w-full items-center justify-center rounded-full',
    'border border-rose-300/25 bg-rose-300/10 px-4 py-3',
    'text-base font-medium tracking-[0.2px] text-rose-100',
    'transition-colors duration-200 ease-in-out',
    'hover:bg-rose-300/20 hover:text-white',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
    appleFontClass
  ].join(' ');
  const iconCircleButtonClass = [
    'flex h-10 w-10 items-center justify-center rounded-full',
    'border border-white/[0.15] bg-white/[0.08] text-[#f5f5f7]',
    'backdrop-blur-md transition-colors duration-200 ease-in-out',
    'hover:bg-white/[0.18]'
  ].join(' ');
  const secondaryMetaClass = ['truncate', appleFontClass].join(' ');

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
        className={`fixed right-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-black/95 text-white
        transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <span
            className={`text-xs font-medium tracking-[0.3px] uppercase text-white/70 ${appleFontClass}`}
          >
            Menu
          </span>
          <button
            aria-label="메뉴 닫기"
            onClick={onClose}
            className={iconCircleButtonClass}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu list */}
        <nav className="px-6 py-7">
          <ul className="list-none space-y-5 p-0 m-0">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className={navItemClass}
                >
                  {item.label}
                </a>
              </li>
            ))}

            {isAuthenticated && (
              <li>
                <button
                  onClick={handleMyPageClick}
                  className={menuActionPrimaryPillClass}
                >
                  My Page
                </button>
              </li>
            )}

            <li>
              <button
                onClick={handleCartClick}
                className={pillButtonClass}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span>
                  Cart{totalItems > 0 ? ` (${totalItems})` : ''}
                </span>
              </button>
            </li>

            <li className="border-t border-white/10 pt-5" />

            {isAuthenticated ? (
              <>
                <li>
                  <div className="space-y-1.5">
                    <p className={`text-sm text-white/90 ${secondaryMetaClass}`}>
                      {user?.name ?? 'User'}
                    </p>
                    <p className={`text-xs text-white/55 ${secondaryMetaClass}`}>
                      {user?.email ?? ''}
                    </p>
                  </div>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className={menuDangerPillClass}
                  >
                    로그아웃
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button
                  onClick={handleLoginClick}
                  className={menuActionPillClass}
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
