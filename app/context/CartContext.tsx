'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

export type CartItemType = 'service';

export type CartItem = {
  key: string;
  id: string;
  type: CartItemType;
  title: string;
  image: string | null;
  price: number | null;
  currency: string;
  quantity: number;
};

export type CartItemInput = Omit<CartItem, 'key' | 'quantity'> & {
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  total: number;
  addItem: (item: CartItemInput) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
};

const STORAGE_KEY = 'zeus-studio-cart-v1';

const CartContext = createContext<CartContextValue | undefined>(undefined);

function safeParseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const obj = item as Partial<CartItem>;
        if (!obj.id || !obj.type || !obj.title) return null;
        const quantity = Math.max(1, Number(obj.quantity ?? 1) || 1);
        return {
          key:
            typeof obj.key === 'string' && obj.key
              ? obj.key
              : `${String(obj.type)}:${String(obj.id)}`,
          id: String(obj.id),
          type: obj.type === 'service' ? 'service' : 'service',
          title: String(obj.title),
          image: typeof obj.image === 'string' ? obj.image : null,
          price:
            typeof obj.price === 'number' && Number.isFinite(obj.price)
              ? obj.price
              : null,
          currency: typeof obj.currency === 'string' && obj.currency ? obj.currency : 'KRW',
          quantity
        } satisfies CartItem;
      })
      .filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setItems(safeParseCart(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((input: CartItemInput) => {
    const nextQty = Math.max(1, Number(input.quantity ?? 1) || 1);
    const key = `${input.type}:${input.id}`;

    setItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (!existing) {
        return [
          ...prev,
          {
            ...input,
            key,
            quantity: nextQty,
            image: input.image ?? null,
            price:
              typeof input.price === 'number' && Number.isFinite(input.price)
                ? input.price
                : null,
            currency: input.currency || 'KRW'
          }
        ];
      }

      return prev.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity: item.quantity + nextQty,
              image: input.image ?? item.image,
              price:
                typeof input.price === 'number' && Number.isFinite(input.price)
                  ? input.price
                  : item.price,
              currency: input.currency || item.currency
            }
          : item
      );
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) {
        return prev.filter((item) => item.key !== key);
      }
      return prev.map((item) =>
        item.key === key ? { ...item, quantity: Math.max(1, Math.floor(qty)) } : item
      );
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (typeof item.price !== 'number') return sum;
        return sum + item.price * item.quantity;
      }, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      itemCount,
      total,
      addItem,
      removeItem,
      updateQty,
      clear
    }),
    [items, hydrated, itemCount, total, addItem, removeItem, updateQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
