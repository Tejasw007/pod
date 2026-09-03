"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import QRCode from "qrcode";

export default function KioskPage() {
  const { podId } = useParams(); // e.g., 'POD-001'
  const router = useRouter();
  
  const [session, setSession] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [code, setCode] = useState(["", "", "", "", ""]);
  const [statusText, setStatusText] = useState("Initializing...");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  const supabase = createClient();

  useEffect(() => {
    initSession();
    const interval = setInterval(initSession, 1 * 60 * 1000); // refresh token every 1 min
    return () => clearInterval(interval);
  }, [podId]);

  useEffect(() => {
    if (!session?.podDbId) return;

    // Listen for order updates mapped to this pod via broadcast
    const channel = supabase
      .channel(`pod_${session.podDbId}`)
      .on(
        "broadcast",
        { event: "order_update" },
        (payload: any) => {
          handleOrderStateChange(payload.payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.podDbId]);

  const initSession = async () => {
    try {
      const res = await fetch("/api/pod/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        
        // Generate QR code for the connect URL
        const connectUrl = `${window.location.origin}/connect?token=${data.token}`;
        const qrUrl = await QRCode.toDataURL(connectUrl, {
          width: 300,
          margin: 1,
          color: { dark: "#1A1A2E", light: "#FFFFFF" }
        });
        setQrDataUrl(qrUrl);
        setStatusText("Ready • Waiting for student...");
      }
    } catch (e) {
      setStatusText("Error connecting to server. Retrying...");
    }
  };

  const handleOrderStateChange = (order: any) => {
    setActiveOrder(order);
    
    if (order.status === "POD_CONNECTED") {
      setStatusText(`Student connected. Waiting for confirmation...`);
    } else if (order.status === "PRINTING") {
      setStatusText(`Printing ${order.file_name}...`);
      simulateHardwarePrint(order.id);
    } else if (order.status === "PRINTED") {
      setStatusText(`Print complete!`);
      setTimeout(() => {
        setActiveOrder(null);
        setStatusText("Ready • Waiting for student...");
        setCode(["", "", "", "", ""]);
        initSession(); // generate new QR to be safe
      }, 5000);
    }
  };

  const handlePodPrintNow = async () => {
    try {
      setStatusText("Starting print...");
      await fetch("/api/pod/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: activeOrder.id, action: "CONFIRM_PRINT" }),
      });
    } catch (e) {
      setStatusText("Failed to start print.");
    }
  };

  const simulateHardwarePrint = async (orderId: string) => {
    // Hardware mock: simulate 4s printing delay then mark as printed
    setTimeout(async () => {
      await fetch("/api/pod/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "PRINT_COMPLETE" }),
      });
    }, 4000);
  };

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
    if (fullCode.length !== 5) return;
    
    setStatusText("Verifying code...");
    try {
      const res = await fetch("/api/pod/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "CODE", code: fullCode, podDbId: session.podDbId }),
      });
      
      if (!res.ok) {
        setStatusText("Invalid code. Try again.");
        setCode(["", "", "", "", ""]);
        setTimeout(() => setStatusText("Ready • Waiting for student..."), 3000);
      }
      // If ok, the realtime subscription will pick up the POD_CONNECTED state
    } catch (e) {
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
          <div style={{ textAlign: "center", animation: "fadeInUp 0.5s ease" }}>
            <div style={{ fontSize: "64px", marginBottom: "24px" }}>
              {activeOrder.status === "PRINTING" ? "🖨️" : activeOrder.status === "PRINTED" ? "✅" : "📱"}
            </div>
            <h2 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "16px" }}>
              {activeOrder.status === "PRINTING" ? "Printing in progress..." : 
               activeOrder.status === "PRINTED" ? "Collect your documents!" : 
               "Connected successfully"}
            </h2>

            {activeOrder.status === "POD_CONNECTED" && (
              <div style={{ marginTop: "24px", width: "100%", maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
                <div style={{ background: "var(--surface)", padding: "24px", borderRadius: "16px", marginBottom: "24px", border: "1px solid var(--border)" }}>
                  <h3 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px", textAlign: "center" }}>
                    Confirm Print Job
                  </h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Student Name</div>
                      <div style={{ fontSize: "18px", fontWeight: 600 }}>{activeOrder.user_name || "Student"}</div>
                    </div>
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
                      <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Color Mode</div>
                      <div style={{ fontSize: "18px", fontWeight: 600 }}>
                        {activeOrder.color_mode === 'bw' ? '⚫ Black & White' : '🔴 Color'}
                      </div>
                    </div>
                  </div>

                  {activeOrder.file_drive_link && (
                    <div>
                      <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Document Preview</div>
                      <div style={{ border: "2px solid var(--border)", borderRadius: "8px", overflow: "hidden", height: "350px", position: "relative" }}>
                        <iframe 
                          src={activeOrder.file_drive_link} 
                          width="100%" 
                          height="100%" 
                          title="Document Preview" 
                          style={{ 
                            border: "none",
                            filter: activeOrder.color_mode === 'bw' ? 'grayscale(100%) contrast(1.1)' : 'none'
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  className="btn-primary" 
                  style={{ fontSize: "20px", padding: "16px 48px", borderRadius: "32px", width: "100%" }}
                  onClick={handlePodPrintNow}
                >
                  🖨️ Confirm & Print Now
                </button>
              </div>
            )}

            <p style={{ fontSize: "20px", color: "var(--text-secondary)", marginTop: "16px" }}>
              {activeOrder.status === "PRINTING" && `Printing ${activeOrder.page_count * activeOrder.copies} pages. Do not pull the paper.`}
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "24px", color: "var(--text)" }}>Scan to Connect</h2>
            
            <div style={{ background: "white", padding: "16px", borderRadius: "16px", boxShadow: "var(--shadow-lg)", marginBottom: "16px" }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" style={{ width: 250, height: 250 }} />
              ) : (
                <div style={{ width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface)" }}>
                  <span className="spinner"></span>
                </div>
              )}
            </div>
            
            <p style={{ fontSize: "18px", color: "var(--text-secondary)", marginBottom: "32px" }}>Point your phone camera at this QR code</p>

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
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
