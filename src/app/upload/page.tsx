"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FileUp, FileText, X } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState("A4");
  const [colorMode, setColorMode] = useState("bw");
  const [printSide, setPrintSide] = useState("single");

  // Mock price calculation
  const pages = file ? Math.max(1, Math.floor(file.size / 500000)) : 0; // rough estimation for demo
  const ratePerPage = colorMode === "bw" ? 2 : 10;
  const total = pages * copies * ratePerPage;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleProceed = async () => {
    if (!file) return;
    setLoading(true);
    
    // Create form data to upload the file to our API
    const formData = new FormData();
    formData.append("file", file);
    formData.append("copies", copies.toString());
    formData.append("paperSize", paperSize);
    formData.append("colorMode", colorMode);
    formData.append("printSide", printSide);
    formData.append("pages", pages.toString());
    formData.append("total", total.toString());

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const { orderId } = await res.json();
      router.push(`/payment/${orderId}`);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: "80px" }}>
      <header style={{ padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Image src="/logo.png" alt="PrintPod" width={100} height={40} style={{ objectFit: "contain" }} />
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-dark)", fontWeight: 700 }}>
          JD
        </div>
      </header>

      <div style={{ marginTop: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Upload Document</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>Select a file to configure and print.</p>

        {!file ? (
          <div
            className={`upload-zone ${isDragging ? "dragover" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
              <FileUp size={48} strokeWidth={1.5} color="var(--text-secondary)" />
            </div>
            <p style={{ fontWeight: 600, marginBottom: "8px" }}>Drag & drop your file here</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "24px" }}>Supported: PDF, DOCX, PPTX (Max 100MB)</p>
            
            <label className="btn-secondary" style={{ display: "inline-flex" }}>
              <span>Browse Files</span>
              <input 
                type="file" 
                style={{ display: "none" }} 
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
              />
            </label>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", background: "var(--surface)", borderRadius: "8px" }}>
                <FileText size={20} color="var(--primary)" />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {pages} pages
                </div>
              </div>
              <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "8px", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", padding: "20px", background: "var(--surface-dim)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "var(--text)" }}>Print Configuration</h3>
              
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>Paper Size</label>
                  <select className="input" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                    <option value="A4">A4 (Standard)</option>
                    <option value="A3">A3</option>
                    <option value="Letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>Color Mode</label>
                  <div className="toggle-group">
                    <button type="button" className={`toggle-pill ${colorMode === "bw" ? "active" : ""}`} onClick={() => setColorMode("bw")}>B&W</button>
                    <button type="button" className={`toggle-pill ${colorMode === "color" ? "active" : ""}`} onClick={() => setColorMode("color")}>Color</button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>Print Side</label>
                  <div className="toggle-group">
                    <button type="button" className={`toggle-pill ${printSide === "single" ? "active" : ""}`} onClick={() => setPrintSide("single")}>Single Sided</button>
                    <button type="button" className={`toggle-pill ${printSide === "duplex" ? "active" : ""}`} onClick={() => setPrintSide("duplex")}>Double Sided</button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 500 }}>Copies</label>
                  <div className="stepper">
                    <button type="button" className="stepper-btn" onClick={() => setCopies(Math.max(1, copies - 1))}>-</button>
                    <span className="stepper-value">{copies}</span>
                    <button type="button" className="stepper-btn" onClick={() => setCopies(Math.min(10, copies + 1))}>+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {file && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", padding: "16px 24px", borderTop: "1px solid var(--border)", boxShadow: "0 -4px 12px rgba(0,0,0,0.05)", zIndex: 50 }}>
            <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0 }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Total Price</div>
                <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--text)" }}>₹{total}</div>
              </div>
              <button className="btn-primary" onClick={handleProceed} disabled={loading} style={{ minWidth: "160px" }}>
                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : "Proceed to Pay"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
