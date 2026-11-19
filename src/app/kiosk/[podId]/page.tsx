"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { Printer, CheckCircle, Smartphone, Loader2, ShoppingBag } from "lucide-react";
import type { PodOrderEvent } from "@/lib/types";

interface PodSession {
  sessionId: string;
  token: string;
  expiresAt: string;
  podDbId: string;
}

const EMPTY_CODE = ["", "", "", "", ""];
const IDLE_TEXT = "Ready • Waiting for student...";

export default function KioskPage() {
  const { podId } = useParams<{ podId: string }>(); // e.g., 'POD-001'

  const [session, setSession] = useState<PodSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [code, setCode] = useState(EMPTY_CODE);
  const [statusText, setStatusText] = useState("Initializing...");
  const [activeOrder, setActiveOrder] = useState<PodOrderEvent | null>(null);
  const [now, setNow] = useState("");

  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  const startedJobs = useRef<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  // Footer clock (set in an effect so server and client renders match)
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    const id = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, []);

  const initSession = useCallback(async () => {
    try {
      const res = await fetch("/api/pod/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podId }),
      });
      if (!res.ok) return;
      const data: PodSession = await res.json();
      setSession(data);

      // QR code for the connect URL
      const connectUrl = `${window.location.origin}/connect?token=${data.token}`;
      setQrDataUrl(
        await QRCode.toDataURL(connectUrl, {
          width: 300,
          margin: 1,
          color: { dark: "#1A1A2E", light: "#FFFFFF" },
        })
      );
      setStatusText(IDLE_TEXT);
    } catch {
      setStatusText("Error connecting to server. Retrying...");
    }
  }, [podId]);

  // Create a session now and refresh the token every minute
  useEffect(() => {
    const first = setTimeout(initSession, 0);
    const interval = setInterval(initSession, 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [initSession]);

  // Hardware mock: after a short delay, report the job as finished
  const simulateHardware = useCallback((order: PodOrderEvent) => {
    const jobKey = `${order.order_type}:${order.id}`;
    if (startedJobs.current.has(jobKey)) return;
    startedJobs.current.add(jobKey);

    setTimeout(async () => {
      await fetch("/api/pod/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          orderType: order.order_type,
          action: order.order_type === "print" ? "PRINT_COMPLETE" : "DISPENSE_COMPLETE",
        }),
      });
    }, 4000);
  }, []);

  const handleOrderStateChange = useCallback(
    (order: PodOrderEvent) => {
      setActiveOrder(order);
      const isPrint = order.order_type === "print";

      if (order.status === "POD_CONNECTED") {
        setStatusText("Student connected. Waiting for confirmation...");
      } else if (order.status === "PRINTING" || order.status === "DISPENSING") {
        setStatusText(
          isPrint && order.order_type === "print" ? `Printing ${order.file_name}...` : "Dispensing items..."
        );
        simulateHardware(order);
      } else if (order.status === "PRINTED" || order.status === "PICKED_UP") {
        setStatusText(isPrint ? "Print complete!" : "Items dispensed!");
        setTimeout(() => {
          setActiveOrder(null);
          setStatusText(IDLE_TEXT);
          setCode(EMPTY_CODE);
          initSession(); // new QR to be safe
        }, 5000);
      }
    },
    [simulateHardware, initSession]
  );

  // Listen for order updates mapped to this pod via broadcast
  const podDbId = session?.podDbId;
  useEffect(() => {
    if (!podDbId) return;

    const channel = supabase
      .channel(`pod_${podDbId}`)
      .on("broadcast", { event: "order_update" }, (message) => {
        handleOrderStateChange(message.payload as PodOrderEvent);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [podDbId, supabase, handleOrderStateChange]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto focus next
    if (value && index < 4) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const submitManualCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 5 || !session) return;

    setStatusText("Verifying code...");
    try {
      const res = await fetch("/api/pod/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CODE", code: fullCode, podDbId: session.podDbId }),
      });

      if (!res.ok) {
        setStatusText("Invalid code. Try again.");
        setCode(EMPTY_CODE);
        setTimeout(() => setStatusText(IDLE_TEXT), 3000);
      }
      // If ok, the realtime subscription will pick up the POD_CONNECTED state
    } catch {
      setStatusText("Error verifying code.");
    }
  };

  return (
    <div className="kiosk-container">
      <div className="kiosk-header">
        <h1>PRINTPOD {podId}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: activeOrder ? "#F59E0B" : "#FFFFFF" }}></div>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>{activeOrder ? "BUSY" : "READY"}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        
        {activeOrder ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              {activeOrder.status === "PRINTING" || activeOrder.status === "DISPENSING" ? (
                <Loader2 size={64} color="var(--primary)" style={{ animation: "spin 2s linear infinite" }} />
              ) : activeOrder.status === "PRINTED" || activeOrder.status === "PICKED_UP" ? (
                <CheckCircle size={64} strokeWidth={1} color="var(--success)" />
              ) : (
                <Smartphone size={64} strokeWidth={1} color="var(--text-secondary)" />
              )}
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "16px" }}>
              {activeOrder.status === "PRINTING" ? "Printing in progress..." :
               activeOrder.status === "DISPENSING" ? "Dispensing your items..." :
               activeOrder.status === "PRINTED" ? "Collect your documents" :
               activeOrder.status === "PICKED_UP" ? "Collect your items" :
               "Connected successfully"}
            </h2>

            {activeOrder.status === "POD_CONNECTED" && (
              <div style={{ marginTop: "24px", width: "100%", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
                <div style={{ background: "var(--surface)", padding: "24px", borderRadius: "var(--radius-lg)", marginBottom: "24px", border: "1px solid var(--border)" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px", textAlign: "center" }}>
                    {activeOrder.order_type === "print" ? "Confirm Print Job" : "Confirm Stationery Pickup"}
                  </h3>

                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Student Name</div>
                    <div style={{ fontSize: "18px", fontWeight: 600 }}>{activeOrder.user_name || "Student"}</div>
                  </div>

                  {activeOrder.order_type === "print" ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                        <div>
                          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Document</div>
                          <div style={{ fontSize: "18px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {activeOrder.file_name}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Total Pages</div>
                          <div style={{ fontSize: "18px", fontWeight: 600 }}>
                            {activeOrder.page_count * activeOrder.copies} ({activeOrder.page_count} pages × {activeOrder.copies} copies)
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Color Mode</div>
                          <div style={{ fontSize: "16px", fontWeight: 600 }}>
                            {activeOrder.color_mode === "bw" ? "Black & White" : "Color"}
                          </div>
                        </div>
                      </div>

                      {activeOrder.file_drive_link && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                          <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px", width: "100%", textAlign: "left" }}>Document Preview</div>
                          <div style={{
                            border: "2px solid var(--border)",
                            borderRadius: "8px",
                            overflow: "hidden",
                            position: "relative",
                            width: "100%",
                            maxWidth: "280px",
                            aspectRatio: "1 / 1.414", // A4 paper ratio
                            background: "#f8f9fa",
                            boxShadow: "var(--shadow-sm)"
                          }}>
                            <iframe
                              src={activeOrder.file_drive_link.replace(/\/view.*/, "/preview")}
                              title="Document Preview"
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "200%",
                                height: "200%",
                                transform: "scale(0.5)",
                                transformOrigin: "top left",
                                border: "none",
                                pointerEvents: "none",
                                filter: activeOrder.color_mode === "bw" ? "grayscale(100%) contrast(1.1)" : "none"
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Items</div>
                      {(activeOrder.stationery_order_items ?? []).map((item) => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", marginBottom: "6px" }}>
                          <span style={{ fontWeight: 600 }}>{item.stationery_products?.name ?? "Item"} × {item.quantity}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>₹{item.unit_price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p style={{ textAlign: "center", fontSize: "18px", fontWeight: 600, color: "var(--text-secondary)", display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }}>
                  {activeOrder.order_type === "print" ? <Printer size={24} /> : <ShoppingBag size={24} />}
                  Confirm on your phone to {activeOrder.order_type === "print" ? "start printing" : "collect your items"}
                </p>
              </div>
            )}

            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginTop: "24px" }}>
              {activeOrder.status === "PRINTING" && activeOrder.order_type === "print" && `Printing ${activeOrder.page_count * activeOrder.copies} pages. Do not pull the paper.`}
              {activeOrder.status === "DISPENSING" && "Collect your items from the tray."}
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px", color: "var(--text)" }}>Scan to Connect</h2>
            
            <div style={{ background: "white", padding: "16px", borderRadius: "16px", boxShadow: "var(--shadow-md)", marginBottom: "16px", border: "1px solid var(--border)" }}>
              {qrDataUrl ? (
                <Image src={qrDataUrl} alt="QR Code" width={250} height={250} unoptimized />
              ) : (
                <div style={{ width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)" }}>
                  <Loader2 size={32} color="var(--text-secondary)" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              )}
            </div>
            
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "32px" }}>Point your phone camera at this QR code</p>

            <div className="divider-text" style={{ width: "400px" }}>
              <span>OR</span>
            </div>

            <p style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>Enter 5-digit code</p>
            <div className="code-input-group" style={{ marginBottom: "24px" }}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeInputs.current[i] = el; }}
                  type="text"
                  className="code-input"
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  maxLength={1}
                />
              ))}
            </div>
            
            <button 
              className="btn-primary" 
              style={{ fontSize: "20px", padding: "16px 48px", borderRadius: "32px" }}
              onClick={submitManualCode}
              disabled={code.join("").length !== 5}
            >
              Connect
            </button>
          </>
        )}
      </div>

      <div style={{ padding: "16px 32px", background: "var(--surface)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "16px", fontWeight: 500 }}>
        <span>Status: {statusText}</span>
        <span>{now}</span>
      </div>
    </div>
  );
}
