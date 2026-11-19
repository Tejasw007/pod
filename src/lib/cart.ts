// Cart utilities — localStorage-backed cart for stationery items

import { useSyncExternalStore } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

const CART_KEY = "printpod_cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// useSyncExternalStore needs a stable snapshot between changes, so we cache the
// parsed cart and only refresh it when the stored JSON actually changes.
const listeners = new Set<() => void>();
const EMPTY_CART: CartItem[] = [];
let cachedRaw: string | null = null;
let cachedCart: CartItem[] = EMPTY_CART;

function notify() {
  listeners.forEach((l) => l());
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  notify();
}

function snapshot(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_KEY);
  } catch {
    return EMPTY_CART;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedCart = raw ? (JSON.parse(raw) as CartItem[]) : EMPTY_CART;
    } catch {
      cachedCart = EMPTY_CART;
    }
  }
  return cachedCart;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Reactive cart; re-renders on any change (also across tabs). */
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY_CART);
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addToCart(item: Omit<CartItem, "quantity">, qty = 1): CartItem[] {
  const cart = readCart();
  const idx = cart.findIndex((c) => c.productId === item.productId);
  if (idx >= 0) {
    cart[idx].quantity += qty;
  } else {
    cart.push({ ...item, quantity: qty });
  }
  writeCart(cart);
  return cart;
}

export function updateQuantity(productId: string, quantity: number): CartItem[] {
  const cart = readCart();
  if (quantity <= 0) {
    return removeFromCart(productId);
  }
  const idx = cart.findIndex((c) => c.productId === productId);
  if (idx >= 0) cart[idx].quantity = quantity;
  writeCart(cart);
  return cart;
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = readCart().filter((c) => c.productId !== productId);
  writeCart(cart);
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  notify();
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.quantity, 0);
}
