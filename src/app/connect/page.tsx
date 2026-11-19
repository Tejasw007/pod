"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileText, ShoppingBag, CheckCircle2, CheckCircle, Loader2 } from "lucide-react";
import type { OrderKind, PrintOrder, StationeryOrder } from "@/lib/types";

type ReadyOrder =
  | { kind: "print"; order: PrintOrder }
  | { kind: "stationery"; order: StationeryOrder };

const TABLE = { print: "print_orders", stationery: "stationery_orders" } as const;

const keyOf = (o: ReadyOrder) => `${o.kind}:${o.order.id}`;

function describe(o: ReadyOrder) {
  if (o.kind === "print") {
    return {
      title: o.order.file_name,
      detail: `${o.order.page_count} pages • ${o.order.copies} copies • ${o.order.paper_size} • ${o.order.color_mode.toUpperCase()}`,
    };
  }
  const items = o.order.stationery_order_items ?? [];
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return {
    title: items.length === 1 ? items[0].stationery_products?.name ?? "Stationery order" : "Stationery order",
    detail: `${count} ${count === 1 ? "item" : "items"}${items.length > 1 ? ` • ${items.length} products` : ""}`,
  };
}

function ConnectPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(token ? "" : "No connection token provided.");
  const [connected, setConnected] = useState<ReadyOrder | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Load the student's orders that are ready to be picked up at a pod
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(`/connect?token=${token}`)}`);
        return;
      }

      const [prints, stationery] = await Promise.all([
        supabase.from("print_orders").select("*").eq("user_id", user.id).eq("status", "READY_FOR_PRINT"),
        supabase
          .from("stationery_orders")
          .select("*, stationery_order_items(id, product_id, quantity, unit_price, stationery_products(name, price))")
          .eq("user_id", user.id)
          .eq("status", "READY_FOR_PICKUP"),
      ]);
      if (cancelled) return;

      if (prints.error || stationery.error) {
        setError("Failed to fetch orders.");
      } else {
        const all: ReadyOrder[] = [
          ...((prints.data ?? []) as unknown as PrintOrder[]).map((order) => ({ kind: "print" as const, order })),
          ...((stationery.data ?? []) as unknown as StationeryOrder[]).map((order) => ({ kind: "stationery" as const, order })),
        ];
        setOrders(all);
        if (all.length === 1) setSelectedKey(keyOf(all[0]));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, supabase, router]);

  // Keep the phone in sync with pod-driven state changes
  const connectedKind = connected?.kind;
  const connectedId = connected?.order.id;
  useEffect(() => {
    if (!connectedKind || !connectedId) return;

    const channel = supabase
      .channel(`order_${connectedId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: TABLE[connectedKind], filter: `id=eq.${connectedId}` },
        (payload) => {
          const status = (payload.new as { status: string }).status;
          setConnected((prev) => (prev ? ({ ...prev, order: { ...prev.order, status } } as ReadyOrder) : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectedKind, connectedId, supabase]);

  const handleConnect = async () => {
    const selected = orders.find((o) => keyOf(o) === selectedKey);
    if (!selected) return;
    setConnecting(true);

    try {
      const res = await fetch("/api/pod/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TOKEN", token, orderId: selected.order.id, orderType: selected.kind }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");

      setConnected({ ...selected, order: { ...selected.order, status: "POD_CONNECTED" } } as ReadyOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirm = async () => {
    if (!connected) return;
    try {
      const res = await fetch("/api/pod/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: connected.kind === "print" ? "CONFIRM_PRINT" : "CONFIRM_DISPENSE",
          orderType: connected.kind as OrderKind,
          orderId: connected.order.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      // The realtime subscription moves us to the in-progress state
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm");
    }
  };

  if (loading) return <div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Loading...</div>;
  if (error) return <div className="container" style={{ padding: "40px 16px", textAlign: "center", color: "var(--error)" }}>{error}</div>;

  if (connected) {
    const isPrint = connected.kind === "print";
    const { title, detail } = describe(connected);
    const status = connected.order.status;
    const Icon = isPrint ? FileText : ShoppingBag;

    return (
      <div className="container" style={{ paddingTop: "24px" }}>
        <div style={{ background: "var(--primary-50)", color: "var(--primary-dark)", padding: "16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", textAlign: "center", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <CheckCircle2 size={18} />
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Connected to PrintPod</div>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", background: "white", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "var(--surface)", borderRadius: "8px" }}>
              <Icon size={20} color="var(--primary)" />
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{detail}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Total Amount</span>
            <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>₹{connected.order.total_price}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Payment Status</span>
            <span className="badge badge-paid">Paid</span>
          </div>
        </div>

        {status === "POD_CONNECTED" && (
          <>
            <button className="btn-primary" onClick={handleConfirm} style={{ width: "100%", padding: "16px", fontSize: "16px", marginBottom: "16px" }}>
              {isPrint ? "Confirm & Print" : "Confirm & Collect"}
            </button>
            <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
              {isPrint ? "Your document will start printing immediately." : "Your items will be dispensed immediately."}
            </p>
          </>
        )}

        {(status === "PRINTING" || status === "DISPENSING") && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <Loader2 size={32} color="var(--text-secondary)" style={{ margin: "0 auto 24px", animation: "spin 1s linear infinite" }} />
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              {isPrint ? "Printing in progress" : "Dispensing your items"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {isPrint ? "Please wait at the pod. Do not pull the paper." : "Please wait at the pod. Collect your items from the tray."}
            </p>
          </div>
        )}

        {(status === "PRINTED" || status === "PICKED_UP") && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <CheckCircle size={48} strokeWidth={1} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              {isPrint ? "Print Complete" : "Items Dispensed"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>
              {isPrint ? "Don't forget to collect your documents." : "Don't forget to collect your items."}
            </p>
            <button className="btn-secondary" onClick={() => router.push("/orders")} style={{ width: "100%" }}>
              Back to My Orders
            </button>
          </div>
        )}
      </div>
    );
  }

  // Pre-connection selection screen
  return (
    <div className="container" style={{ paddingTop: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Connect to PrintPod</h1>

      {orders.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>You have no paid orders ready for this pod.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => router.push("/upload")}>Upload a Document</button>
            <button className="btn-secondary" onClick={() => router.push("/store")}>Visit Store</button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>Select an order to use at this pod.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
            {orders.map((o) => {
              const { title, detail } = describe(o);
              const Icon = o.kind === "print" ? FileText : ShoppingBag;
              const selected = selectedKey === keyOf(o);
              return (
                <div
                  key={keyOf(o)}
                  style={{
                    padding: "16px",
                    cursor: "pointer",
                    border: selected ? "2px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    background: "white",
                    boxShadow: selected ? "var(--shadow-sm)" : "none",
                  }}
                  onClick={() => setSelectedKey(keyOf(o))}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <Icon size={20} color="var(--text-secondary)" />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "2px", fontSize: "15px" }}>{title}</div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {detail} • ₹{o.order.total_price}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="btn-primary"
            onClick={handleConnect}
            disabled={!selectedKey || connecting}
            style={{ width: "100%", padding: "16px" }}
          >
            {connecting ? "Connecting..." : "Connect to Pod"}
          </button>
        </>
      )}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px" }}>Loading...</div>}>
      <ConnectPageContent />
    </Suspense>
  );
}
