// Cart utilities — localStorage-backed cart for stationery items

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

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
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
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.quantity, 0);
}
