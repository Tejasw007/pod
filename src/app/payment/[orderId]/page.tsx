"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReceiptPrinter, { type ReceiptLine } from "@/components/ReceiptPrinter";
import type { OrderKind, PrintOrder, StationeryOrder } from "@/lib/types";

const PAID_STATES: Record<OrderKind, string[]> = {
  print: ["READY_FOR_PRINT", "PAID"],
  stationery: ["READY_FOR_PICKUP", "PAID"],
};

function PaymentContent() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const kind: OrderKind = searchParams.get("type") === "stationery" ? "stationery" : "print";

  const [printOrder, setPrintOrder] = useState<PrintOrder | null>(null);
  const [stationeryOrder, setStationeryOrder] = useState<StationeryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      let status: string | null = null;

      if (kind === "print") {
        const { data } = await supabase.from("print_orders").select("*").eq("id", orderId).single();
        if (cancelled) return;
        setPrintOrder(data as PrintOrder | null);
        status = data?.status ?? null;
      } else {
        const { data } = await supabase
          .from("stationery_orders")
          .select("*, stationery_order_items(id, product_id, quantity, unit_price, stationery_products(name, price))")
          .eq("id", orderId)
          .single();
        if (cancelled) return;
        setStationeryOrder(data as StationeryOrder | null);
        status = data?.status ?? null;
      }

      if (status && PAID_STATES[kind].includes(status)) setPaid(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, kind]);

  const handleMockPayment = async () => {
    setPaying(true);
    try {
      const endpoint = kind === "print" ? "/api/orders/pay" : "/api/store/orders/pay";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) throw new Error("Payment failed");
      const { pickupCode } = await res.json();

      // The pickup code is generated server-side; reflect it locally
      if (kind === "print") {
        setPrintOrder((o) => (o ? { ...o, pickup_code: pickupCode, status: "READY_FOR_PRINT" } : o));
      } else {
        setStationeryOrder((o) => (o ? { ...o, pickup_code: pickupCode, status: "READY_FOR_PICKUP" } : o));
      }
      setPaid(true);
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const order = kind === "print" ? printOrder : stationeryOrder;

  if (loading) {
    return <div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Loading...</div>;
  }
  if (!order) {
    return <div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Order not found.</div>;
  }

  const receiptLines: ReceiptLine[] =
    kind === "print" && printOrder
      ? [
          { label: printOrder.file_name },
          { label: `${printOrder.page_count} pages x ${printOrder.copies} copies`, amount: printOrder.total_price },
        ]
      : (stationeryOrder?.stationery_order_items ?? []).map((i) => ({
          label: `${i.stationery_products?.name ?? "Item"} x ${i.quantity}`,
          amount: i.unit_price * i.quantity,
        }));

  if (paid) {
    return (
      <div className="container" style={{ paddingTop: "40px" }}>
        <ReceiptPrinter
          orderId={order.id}
          kind={kind}
          lines={receiptLines}
          grandTotal={order.total_price}
          pickupCode={order.pickup_code ?? undefined}
        />
      </div>
    );
  }

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
      <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{label}</span>
      <span style={{ fontWeight: 600, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: "40px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Checkout</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px", textAlign: "center" }}>
        {kind === "print" ? "Complete your payment to print." : "Complete your payment to collect your items."}
      </p>

      <div className="card" style={{ marginBottom: "24px" }}>
        {kind === "print" && printOrder ? (
          <>
            {row("Document", printOrder.file_name)}
            {row("Pages", printOrder.page_count)}
            {row("Copies", printOrder.copies)}
            {row("Print Config", `${printOrder.paper_size}, ${printOrder.color_mode.toUpperCase()}, ${printOrder.print_side === "single" ? "Single" : "Duplex"}`)}
          </>
        ) : (
          (stationeryOrder?.stationery_order_items ?? []).map((i) => (
            <div key={i.id}>{row(`${i.stationery_products?.name ?? "Item"} × ${i.quantity}`, `₹${i.unit_price * i.quantity}`)}</div>
          ))
        )}

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

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
