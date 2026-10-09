"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CheckCircle } from "lucide-react";
import {
  getCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotal,
  getCartCount,
  type CartItem,
} from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderId: string; pickupCode: string } | null>(null);

  useEffect(() => {
    setCart(getCart());
  }, []);

  const handleQty = (productId: string, delta: number) => {
    const item = cart.find((c) => c.productId === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(removeFromCart(productId));
    } else {
      setCart(updateQuantity(productId, newQty));
    }
  };

  const handleRemove = (productId: string) => {
    setCart(removeFromCart(productId));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);

    try {
      // 1. Create order
      const items = cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        unitPrice: c.price,
      }));

      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const { orderId } = await res.json();

      // 2. Mock pay
      const payRes = await fetch("/api/store/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!payRes.ok) throw new Error("Payment failed");
      const { pickupCode } = await payRes.json();

      // 3. Clear cart & show success
      clearCart();
      setCart([]);
      setOrderResult({ orderId, pickupCode });
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const total = getCartTotal(cart);
  const count = getCartCount(cart);

  // Success state
  if (orderResult) {
    return (
      <div className="container" style={{ paddingTop: "60px", textAlign: "center" }}>
        <div style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "#ECFDF5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <CheckCircle size={36} color="#047857" />
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Order Placed!</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
          Show this code at the pod to collect your items.
        </p>

        <div style={{
          background: "var(--surface-dim)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          marginBottom: "32px",
        }}>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "8px" }}>
            Pickup Code
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "36px",
            fontWeight: 700,
            letterSpacing: "4px",
            color: "var(--primary-dark)",
          }}>
            {orderResult.pickupCode}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link href="/orders" className="btn-primary" style={{ width: "100%", textDecoration: "none" }}>
            View My Orders
          </Link>
          <Link href="/store" className="btn-secondary" style={{ width: "100%", textDecoration: "none" }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: "120px" }}>
      <header style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => router.push("/store")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
          aria-label="Back to store"
        >
          <ArrowLeft size={22} color="var(--text)" />
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: 700, flex: 1 }}>Your Cart</h1>
        <span style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500 }}>
          {count} {count === 1 ? "item" : "items"}
        </span>
      </header>

      {cart.length === 0 ? (
        <div style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "white",
          textAlign: "center",
          padding: "64px 24px",
          marginTop: "24px",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <ShoppingBag size={48} strokeWidth={1} color="var(--border)" />
          </div>
          <h3 style={{ fontWeight: 600, marginBottom: "8px", fontSize: "16px" }}>Cart is empty</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
            Browse the store to add items.
          </p>
          <Link href="/store" className="btn-primary" style={{ textDecoration: "none" }}>
            Browse Store
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
            {cart.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>{item.name}</div>
                  <div style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                  </div>
                </div>

                <div className="stepper" style={{ gap: "8px" }}>
                  <button
                    className="stepper-btn"
                    onClick={() => handleQty(item.productId, -1)}
                    style={{ width: "30px", height: "30px" }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: "15px",
                    minWidth: "20px",
                    textAlign: "center",
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    className="stepper-btn"
                    onClick={() => handleQty(item.productId, 1)}
                    style={{ width: "30px", height: "30px" }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => handleRemove(item.productId)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px",
                    color: "var(--text-secondary)",
                    display: "flex",
                  }}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div style={{
            marginTop: "24px",
            padding: "20px",
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>Order Summary</h3>

            {cart.map((item) => (
              <div key={item.productId} style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>₹{item.price * item.quantity}</span>
              </div>
            ))}

            <div style={{ borderTop: "1px dashed var(--border)", margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "16px" }}>Total</span>
              <span style={{
                fontWeight: 800,
                fontSize: "22px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--primary)",
              }}>
                ₹{total}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Fixed bottom pay bar */}
      {cart.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "64px",
          left: 0,
          right: 0,
          background: "white",
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
          zIndex: 50,
        }}>
          <div className="container" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 0,
          }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Total</div>
              <div style={{
                fontSize: "24px",
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text)",
              }}>
                ₹{total}
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={handlePlaceOrder}
              disabled={placing}
              style={{ minWidth: "160px" }}
            >
              {placing
                ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                : "Place Order"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
