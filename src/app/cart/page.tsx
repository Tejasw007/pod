"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from "lucide-react";
import {
  useCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotal,
  getCartCount,
} from "@/lib/cart";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const [placing, setPlacing] = useState(false);

  const handleQty = (productId: string, delta: number) => {
    const item = cart.find((c) => c.productId === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) removeFromCart(productId);
    else updateQuantity(productId, Math.min(newQty, 99));
  };

  const handleRemove = (productId: string) => {
    removeFromCart(productId);
  };

  // Same flow as printing: create the order (PAYMENT_PENDING), then check out.
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);

    try {
      // Prices are resolved server-side; only ids and quantities are sent.
      const items = cart.map((c) => ({ productId: c.productId, quantity: c.quantity }));

      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.status === 401) {
        router.push("/login?redirect=/cart");
        return;
      }
      if (!res.ok) throw new Error("Failed to create order");
      const { orderId } = await res.json();

      clearCart();
      router.push(`/payment/${orderId}?type=stationery`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const total = getCartTotal(cart);
  const count = getCartCount(cart);

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
                : "Proceed to Pay"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
