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
  { label: 'Goods', href: '#services' },
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
        className={`fixed inset-0 z-40 bg-[rgba(31,24,18,0.18)] backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[18rem] max-w-[92vw] border-l border-stone-900/10 bg-[#f8fbff] shadow-none backdrop-blur-xl transition-transform duration-300 sm:w-[20rem] sm:max-w-[90vw] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-stone-900/10 px-5 py-4">
          <div>
            <p className="section-kicker !text-[0.58rem]">Navigation</p>
            <p className="display-font text-base font-semibold tracking-[0.08em] text-stone-950">
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

        <nav className="px-5 py-6">
          <ul className="m-0 list-none space-y-2 p-0">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className="block px-1 py-2.5 text-base font-medium text-stone-800 no-underline transition hover:text-stone-950"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-stone-900/10 pt-5">
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
                  <p className="break-words text-sm leading-snug text-stone-900">
                    {user?.name ?? 'User'}
                  </p>
                  <p className="break-all text-xs text-stone-500">{user?.email ?? ''}</p>
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
