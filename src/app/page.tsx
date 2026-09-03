import Link from "next/link";
import Image from "next/image";
import { Upload, CreditCard, Printer } from "lucide-react";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px", width: "100%" }}>
        <Image
          src="/logo.png"
          alt="PrintPod"
          width={180}
          height={180}
          style={{ margin: "0 auto 32px", objectFit: "contain" }}
          priority
        />

        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "32px",
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: "12px",
            letterSpacing: "-0.02em"
          }}
        >
          Print. Pay. Pickup.
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            marginBottom: "48px",
            lineHeight: 1.5,
          }}
        >
          Upload, pay, and collect documents at any campus PrintPod location.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
          <Link href="/login" className="btn-primary" style={{ width: "100%", textDecoration: "none", fontSize: "16px", padding: "14px 24px" }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-secondary" style={{ width: "100%", textDecoration: "none" }}>
            Create Account
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "24px",
            borderTop: "1px solid var(--border)",
            paddingTop: "32px"
          }}
        >
          {[
            { icon: <Upload size={24} strokeWidth={1.5} />, label: "Upload" },
            { icon: <CreditCard size={24} strokeWidth={1.5} />, label: "Pay" },
            { icon: <Printer size={24} strokeWidth={1.5} />, label: "Print" },
          ].map((step, idx) => (
            <div key={step.label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ 
                color: "var(--text)", 
                marginBottom: "8px", 
                width: "40px", 
                height: "40px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                background: "var(--surface)",
                borderRadius: "8px"
              }}>
                {step.icon}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ color: "var(--text)", fontWeight: 600, marginRight: "4px" }}>{idx + 1}.</span> {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
