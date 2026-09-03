"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReceiptPrinter from "@/components/ReceiptPrinter";

export default function PaymentPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("print_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        console.error("Order not found", error);
        return;
      }

      setOrder(data);
      if (data.status === "READY_FOR_PRINT" || data.status === "PAID") {
        setPaid(true);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [orderId]);

  const handleMockPayment = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) throw new Error("Payment failed");

      setPaid(true);
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleTorn = () => {
    // We no longer auto-redirect so the user can read the pickup code
  };

  if (loading) {
    return <div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Loading...</div>;
  }

  if (!order) {
    return <div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Order not found.</div>;
  }

  if (paid) {
    return (
      <div className="container" style={{ paddingTop: "40px" }}>
        <ReceiptPrinter
          orderId={order.id}
          fileName={order.file_name}
          pages={order.page_count}
          copies={order.copies}
          ratePerPage={order.color_mode === "bw" ? 2 : 10}
          grandTotal={order.total_price}
          pickupCode={order.pickup_code}
          onTorn={handleTorn}
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Checkout</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px", textAlign: "center" }}>Complete your payment to print.</p>

      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Document</span>
          <span style={{ fontWeight: 600, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.file_name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Pages</span>
          <span style={{ fontWeight: 600 }}>{order.page_count}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Copies</span>
          <span style={{ fontWeight: 600 }}>{order.copies}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Print Config</span>
          <span style={{ fontWeight: 600 }}>{order.paper_size}, {order.color_mode.toUpperCase()}, {order.print_side === 'single' ? 'Single' : 'Duplex'}</span>
        </div>
        
        <div style={{ borderTop: "1px dashed var(--border)", margin: "16px 0" }}></div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: "24px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>₹{order.total_price}</span>
        </div>
      </div>

      <button className="btn-primary" onClick={handleMockPayment} disabled={paying} style={{ width: "100%", padding: "16px", fontSize: "16px" }}>
        {paying ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : "Pay via Razorpay (Mock)"}
      </button>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "12px", marginTop: "16px" }}>This is a mock payment for MVP. It will simulate a successful payment.</p>
    </div>
  );
}
