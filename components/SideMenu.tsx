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
  { label: 'Community', href: '#community' }
];

export default function SideMenu({
  isOpen,
  onClose,
  onCartClick,
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
        className={`fixed inset-0 z-40 bg-[#020402d4] backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[20rem] max-w-[90vw] border-l border-cyan-300/25 bg-[#060a14f2] shadow-[-20px_0_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-cyan-300/18 px-5 py-4">
          <div>
            <p className="section-kicker !text-[0.58rem]">Navigation</p>
            <p className="display-font text-base font-medium tracking-[0.12em] text-cyan-50">
              Shadow Index
            </p>
          </div>
          <button
            aria-label="메뉴 닫기"
            onClick={onClose}
            className="y2k-button y2k-button-ghost y2k-button-icon"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-5 py-6">
          <ul className="m-0 list-none space-y-2 p-0">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-[0.95rem] border border-transparent bg-transparent px-3 py-2.5 text-base font-medium text-cyan-100/85 no-underline transition hover:border-cyan-300/18 hover:bg-[#0d1831] hover:text-white"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-cyan-300/18 pt-5">
            {isAuthenticated && (
              <button
                onClick={handleMyPageClick}
                className="y2k-button y2k-button-ghost w-full justify-center"
              >
                MY PAGE
              </button>
            )}

            <button
              onClick={handleCartClick}
              className="y2k-button y2k-button-primary w-full justify-center"
            >
              <ShoppingCart className="h-4 w-4" />
              CART{totalItems > 0 ? ` (${totalItems})` : ''}
            </button>

            {isAuthenticated ? (
              <>
                <div className="rounded-xl border border-cyan-300/18 bg-[#0d1628cc] px-3 py-2.5">
                  <p className="truncate text-sm text-cyan-50">{user?.name ?? 'User'}</p>
                  <p className="truncate text-xs text-cyan-200/60">{user?.email ?? ''}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="y2k-button y2k-button-accent w-full justify-center"
                >
                  LOGOUT
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginClick}
                className="y2k-button y2k-button-accent w-full justify-center"
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
