"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ScanLine, ClipboardList, MapPin, ShoppingBag, Printer } from "lucide-react";

export default function OrdersPage() {
  const [printOrders, setPrintOrders] = useState<any[]>([]);
  const [stationeryOrders, setStationeryOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<"print" | "stationery">("print");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const supabase = createClient();

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch print orders
    const { data: prints } = await supabase
      .from("print_orders")
      .select("*, pods(name, location)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (prints) setPrintOrders(prints);

    // Fetch stationery orders
    const { data: stationery } = await supabase
      .from("stationery_orders")
      .select("*, stationery_order_items(*, stationery_products(name, price))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (stationery) setStationeryOrders(stationery);

    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time print order updates
    const printChannel = supabase
      .channel("orders_channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "print_orders" },
        (payload: any) => {
          setPrintOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, status: payload.new.status } : o
            )
          );
        }
      )
      .subscribe();

    // Subscribe to real-time stationery order updates
    const stationeryChannel = supabase
      .channel("stationery_orders_channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stationery_orders" },
        (payload: any) => {
          setStationeryOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, status: payload.new.status } : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(printChannel);
      supabase.removeChannel(stationeryChannel);
    };
  }, [supabase]);

  const handleConfirmPrint = async (orderId: string) => {
    try {
      const res = await fetch("/api/pod/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_PRINT", orderId }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "READY_FOR_PRINT": return "badge-ready";
      case "POD_CONNECTED": return "badge-ready";
      case "PRINTING": return "badge-printing";
      case "PRINTED": return "badge-printed";
      case "CANCELLED": return "badge-cancelled";
      case "PRINT_FAILED": return "badge-failed";
      case "PAYMENT_PENDING": return "badge-pending";
      case "PAID": return "badge-paid";
      case "READY_FOR_PICKUP": return "badge-ready";
      case "PICKED_UP": return "badge-printed";
      default: return "badge-printed";
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ");

  // Print order filters
  const filteredPrint = printOrders.filter((o) => {
    if (filter === "ACTIVE") {
      return ["READY_FOR_PRINT", "POD_CONNECTED", "AWAITING_CONFIRMATION", "PRINTING"].includes(o.status);
    }
    if (filter === "COMPLETED") {
      return ["PRINTED", "CANCELLED", "PRINT_FAILED"].includes(o.status);
    }
    return true;
  });

  // Stationery order filters
  const filteredStationery = stationeryOrders.filter((o) => {
    if (filter === "ACTIVE") {
      return ["CREATED", "PAID", "READY_FOR_PICKUP"].includes(o.status);
    }
    if (filter === "COMPLETED") {
      return ["PICKED_UP", "CANCELLED"].includes(o.status);
    }
    return true;
  });

  return (
    <div className="container" style={{ paddingBottom: "80px" }}>
      <header style={{ padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Image src="/logo.png" alt="PrintPod" width={100} height={40} style={{ objectFit: "contain" }} />
      </header>

      <div style={{ marginTop: "16px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>My Orders</h1>

        {/* Print / Stationery tab toggle */}
        <div className="toggle-group" style={{ marginBottom: "16px" }}>
          <button
            type="button"
            className={`toggle-pill ${tab === "print" ? "active" : ""}`}
            onClick={() => { setTab("print"); setFilter("ALL"); }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Printer size={15} /> Print
            </span>
          </button>
          <button
            type="button"
            className={`toggle-pill ${tab === "stationery" ? "active" : ""}`}
            onClick={() => { setTab("stationery"); setFilter("ALL"); }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <ShoppingBag size={15} /> Stationery
            </span>
          </button>
        </div>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "16px" }}>
          {["ALL", "ACTIVE", "COMPLETED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: filter === f ? "none" : "1px solid var(--border)",
                background: filter === f ? "var(--primary)" : "white",
                color: filter === f ? "white" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>Loading...</div>
        ) : tab === "print" ? (
          /* ─── Print Orders Tab ─── */
          filteredPrint.length === 0 ? (
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "white", textAlign: "center", padding: "64px 24px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <ClipboardList size={48} strokeWidth={1} color="var(--border)" />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: "8px", fontSize: "16px" }}>No print orders</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Upload a document to get started.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredPrint.map((order) => (
                <div key={order.id} style={{ padding: "20px", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <span className={`badge ${getBadgeClass(order.status)}`}>{formatStatus(order.status)}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "16px" }}>{order.file_name}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                    {order.page_count} pages • {order.copies} copies • {order.paper_size} • {order.color_mode.toUpperCase()}
                  </div>

                  {order.status === "READY_FOR_PRINT" && order.pickup_code && (
                    <div style={{ background: "var(--surface-dim)", padding: "12px", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Pickup Code</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, letterSpacing: "2px", color: "var(--primary-dark)" }}>
                        {order.pickup_code}
                      </span>
                    </div>
                  )}

                  {order.pods && (
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} /> {order.pods.name} - {order.pods.location}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: "16px" }}>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: "16px" }}>₹{order.total_price}</span>
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                      {order.file_drive_link && (
                        <a href={order.file_drive_link} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "13px", textDecoration: "none" }}>
                          Preview
                        </a>
                      )}
                      
                      {order.status === "PAYMENT_PENDING" && (
                        <Link href={`/payment/${order.id}`} className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                          Pay Now
                        </Link>
                      )}
                      {order.status === "READY_FOR_PRINT" && (
                        <button className="btn-secondary" style={{ padding: "8px 16px", fontSize: "13px", color: "var(--primary)" }} onClick={() => alert("Scan the QR code at the pod or enter your pickup code on the screen.")}>
                          How to print?
                        </button>
                      )}
                      {order.status === "POD_CONNECTED" && (
                        <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => handleConfirmPrint(order.id)}>
                          Confirm & Print
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ─── Stationery Orders Tab ─── */
          filteredStationery.length === 0 ? (
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "white", textAlign: "center", padding: "64px 24px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <ShoppingBag size={48} strokeWidth={1} color="var(--border)" />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: "8px", fontSize: "16px" }}>No stationery orders</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Visit the <Link href="/store" style={{ color: "var(--primary)", fontWeight: 600 }}>Store</Link> to buy items.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredStationery.map((order) => (
                <div key={order.id} style={{ padding: "20px", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <span className={`badge ${getBadgeClass(order.status)}`}>{formatStatus(order.status)}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Line items */}
                  <div style={{ marginBottom: "16px" }}>
                    {order.stationery_order_items?.map((item: any) => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>
                          {item.stationery_products?.name || "Item"} × {item.quantity}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                          ₹{item.unit_price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pickup code */}
                  {order.pickup_code && ["PAID", "READY_FOR_PICKUP"].includes(order.status) && (
                    <div style={{ background: "var(--surface-dim)", padding: "12px", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Pickup Code</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "20px", fontWeight: 700, letterSpacing: "2px", color: "var(--primary-dark)" }}>
                        {order.pickup_code}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: "16px" }}>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: "16px" }}>₹{order.total_price}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {order.stationery_order_items?.length || 0} {(order.stationery_order_items?.length || 0) === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Floating Action Button for Scanning (print tab only) */}
      {tab === "print" && (
        <button
          onClick={() => setScanning(true)}
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "28px",
            background: "var(--primary)",
            color: "white",
            border: "none",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 100
          }}
          aria-label="Scan Pod QR Code"
        >
          <ScanLine size={24} />
        </button>
      )}

      {/* Full-screen Scanner Modal */}
      {scanning && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 9999, background: "black" }}>
          <div style={{ position: "absolute", top: "40px", left: 0, right: 0, textAlign: "center", color: "white", zIndex: 10000, fontSize: "18px", fontWeight: 600 }}>
            Scan PrintPod QR Code
          </div>
          <Scanner 
            onScan={(result) => { 
              if (result && result.length > 0 && result[0]?.rawValue) {
                 setScanning(false);
                 window.location.href = result[0].rawValue;
              } 
            }} 
          />
          <button 
            onClick={() => setScanning(false)} 
            style={{ 
              position: "absolute", 
              bottom: "40px", 
              left: "50%", 
              transform: "translateX(-50%)", 
              zIndex: 10000, 
              padding: "16px 32px", 
              background: "white", 
              color: "black",
              border: "none",
              borderRadius: "32px",
              fontWeight: 700,
              fontSize: "16px"
            }}
          >
            Cancel Scan
          </button>
        </div>
      )}
    </div>
  );
}
