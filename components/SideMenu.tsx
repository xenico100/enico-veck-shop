'use client';



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

  const handleKeyActivate = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Menu */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-56 md:w-64 z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >

            aria-label="메뉴 닫기"
            role="button"
            tabIndex={0}
          >
            <X className="w-5 h-5" />
          </div>
        </div>


          <ul className="space-y-4 md:space-y-5 text-sm md:text-base font-light tracking-wide">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={onClose}

                  {item.label}
                </a>
              </li>
            ))}

            {/* My Page (로그인 시만) */}
            {isAuthenticated && (
              <li>
                <div
                  onClick={handleMyPageClick}

                >
                  <span>My Page</span>
                </div>
              </li>
            )}

            {/* Cart */}
            <li>
              <div
                onClick={handleCartClick}

              >
                <ShoppingCart className="w-4 h-4" />
                <span>Cart{totalItems > 0 ? ` (${totalItems})` : ''}</span>
              </div>
            </li>

            {/* Divider */}
            <li className="pt-3">

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

                  >
                    <span>로그아웃</span>
                  </div>
                </li>
              </>
            ) : (
              <li>
                <div
                  onClick={handleLoginClick}

              </li>
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}
