"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ConnectPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [connectedOrder, setConnectedOrder] = useState<any>(null); // State after connection
  
  const supabase = createClient();

  useEffect(() => {
    if (!token) {
      setError("No connection token provided.");
      setLoading(false);
      return;
    }
    fetchReadyOrders();
  }, [token]);

  // Listen to order updates so student phone updates if kiosk changes state
  useEffect(() => {
    if (!connectedOrder) return;
    
    const channel = supabase.channel(`order_${connectedOrder.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "print_orders", filter: `id=eq.${connectedOrder.id}` }, (payload) => {
        setConnectedOrder(payload.new);
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [connectedOrder]);

  async function fetchReadyOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?redirect=/connect?token=" + token);
      return;
    }

    const { data, error } = await supabase
      .from("print_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "READY_FOR_PRINT");

    if (error) {
      setError("Failed to fetch orders.");
    } else {
      setOrders(data);
      if (data.length === 1) {
        setSelectedOrderId(data[0].id);
      }
    }
    setLoading(false);
  }

  const handleConnect = async () => {
    if (!selectedOrderId) return;
    setConnecting(true);
    
    try {
      const res = await fetch("/api/pod/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TOKEN", token, orderId: selectedOrderId }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      
      const order = orders.find(o => o.id === selectedOrderId);
      setConnectedOrder({ ...order, status: "POD_CONNECTED" });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirmPrint = async () => {
    if (!connectedOrder) return;
    
    try {
      const res = await fetch("/api/pod/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_PRINT", orderId: connectedOrder.id }),
      });
      
      if (!res.ok) throw new Error("Failed to confirm");
      
      // Wait for realtime update to change it to PRINTING
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: "40px 16px", textAlign: "center" }}>Loading...</div>;
  if (error) return <div className="container" style={{ padding: "40px 16px", textAlign: "center", color: "var(--error)" }}>{error}</div>;

  if (connectedOrder) {
    // Confirmation screen
    return (
      <div className="container" style={{ paddingTop: "24px" }}>
        <div style={{ background: "var(--primary)", color: "white", padding: "16px", borderRadius: "12px", textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Connected to PrintPod ✓</div>
        </div>

        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "32px" }}>📄</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{connectedOrder.file_name}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {connectedOrder.page_count} pages • {connectedOrder.copies} copies • {connectedOrder.paper_size} • {connectedOrder.color_mode.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Total Amount</span>
            <span style={{ fontWeight: 600 }}>₹{connectedOrder.total_price}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Payment Status</span>
            <span className="badge badge-paid">PAID ✓</span>
          </div>
        </div>

        {connectedOrder.status === "POD_CONNECTED" && (
          <>
            <button className="btn-primary" onClick={handleConfirmPrint} style={{ width: "100%", padding: "16px", fontSize: "18px", marginBottom: "16px" }}>
              CONFIRM & PRINT
            </button>
            <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
              Your document will start printing immediately.
            </p>
          </>
        )}

        {connectedOrder.status === "PRINTING" && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4, margin: "0 auto 24px", borderColor: "var(--border)", borderTopColor: "var(--warning)" }}></div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Printing in progress...</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Please wait at the pod. Do not pull the paper.</p>
          </div>
        )}

        {connectedOrder.status === "PRINTED" && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Print Complete!</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "32px" }}>Don't forget to collect your documents.</p>
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
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>You have no documents ready for printing.</p>
          <button className="btn-primary" onClick={() => router.push("/upload")}>Upload a Document</button>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>Select a document to print at this pod.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
            {orders.map(order => (
              <div 
                key={order.id} 
                className="card" 
                style={{ 
                  padding: "16px", 
                  cursor: "pointer", 
                  border: selectedOrderId === order.id ? "2px solid var(--primary)" : "1px solid var(--border)",
                  boxShadow: selectedOrderId === order.id ? "0 4px 12px rgba(34, 197, 94, 0.15)" : "var(--shadow-sm)"
                }}
                onClick={() => setSelectedOrderId(order.id)}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>{order.file_name}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {order.page_count} pages • {order.copies} copies • ₹{order.total_price}
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn-primary" 
            onClick={handleConnect} 
            disabled={!selectedOrderId || connecting}
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
