'use client';

import { useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCartClick?: () => void;
  onDatingClick?: () => void;
  onLoginClick?: () => void;
  onMyPageClick?: () => void;
}

const menuItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Dating', action: 'dating' as const },
  { label: 'Goods', href: '#services' },
  { label: 'Studio', href: '#studio' },
  { label: 'Community', href: '#community' }
];

export default function SideMenu({
  isOpen,
  onClose,
  onCartClick,
  onDatingClick,
  onLoginClick,
  onMyPageClick
}: SideMenuProps) {
  const auth = useAuth();
  const { itemCount } = useCart();

  const totalItems = itemCount;
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

  const handleDatingClick = () => {
    onDatingClick?.();
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
      <div
        className={`fixed inset-0 z-40 bg-[rgba(2,0,0,0.72)] backdrop-blur-[4px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[21rem] max-w-[94vw] border-l border-[rgba(103,14,14,0.72)] bg-[linear-gradient(180deg,rgba(15,0,0,0.98),rgba(7,0,0,0.96))] shadow-[-30px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform duration-300 sm:w-[24rem] sm:max-w-[90vw] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[rgba(103,14,14,0.64)] bg-[repeating-linear-gradient(45deg,rgba(22,0,0,0.98),rgba(22,0,0,0.98)_10px,rgba(9,0,0,0.98)_10px,rgba(9,0,0,0.98)_20px)] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker !text-[0.58rem]">Navigation</p>
              <p className="display-font text-base font-semibold tracking-[0.12em] text-[rgba(251,227,220,0.96)]">
                Wayfinder Index
              </p>
            </div>
            <button
              aria-label="메뉴 닫기"
              onClick={onClose}
              className="y2k-button y2k-button-ghost y2k-button-icon y2k-button-fade-micro"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="px-5 py-6">
          <ul className="m-0 list-none space-y-2 p-0">
            {menuItems.map((item) => (
              <li key={item.label}>
                {'action' in item ? (
                  <button
                    type="button"
                    onClick={handleDatingClick}
                    className="block w-full border-b border-[rgba(92,15,15,0.34)] px-1 py-3 text-left font-[var(--font-brush)] text-base font-medium tracking-[0.08em] text-[rgba(231,204,198,0.92)] transition hover:text-white"
                  >
                    {item.label}
                  </button>
                ) : (
                  <a
                    href={item.href}
                    onClick={onClose}
                    className="block border-b border-[rgba(92,15,15,0.34)] px-1 py-3 font-[var(--font-brush)] text-base font-medium tracking-[0.08em] text-[rgba(231,204,198,0.92)] no-underline transition hover:text-white"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-[rgba(92,15,15,0.44)] pt-5">
            {isAuthenticated && (
              <button
                onClick={handleMyPageClick}
                className="y2k-button y2k-button-ghost y2k-button-fade-micro w-full justify-center"
              >
                MY PAGE
              </button>
            )}

            <button
              onClick={handleCartClick}
              className="y2k-button y2k-button-primary y2k-button-fade-micro w-full justify-center"
            >
              <ShoppingCart className="h-4 w-4" />
              CART{totalItems > 0 ? ` (${totalItems})` : ''}
            </button>

            {isAuthenticated ? (
              <>
                <div className="px-1 py-2.5">
                  <p className="break-words text-sm leading-snug text-[rgba(248,226,219,0.96)]">
                    {user?.name ?? 'User'}
                  </p>
                  <p className="break-all text-xs text-[rgba(172,140,135,0.7)]">
                    {user?.email ?? ''}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="y2k-button y2k-button-accent y2k-button-fade-micro w-full justify-center"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginClick}
                className="y2k-button y2k-button-accent y2k-button-fade-micro w-full justify-center"
              >
                LOGIN
              </button>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
