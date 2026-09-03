import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 50%)",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <Image
          src="/logo.png"
          alt="PrintPod"
          width={200}
          height={200}
          style={{ margin: "0 auto 24px", objectFit: "contain" }}
          priority
        />

        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "32px",
            fontWeight: 800,
            color: "#1A1A2E",
            marginBottom: "8px",
          }}
        >
          Print. Pay. Pickup.
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "#6B7280",
            marginBottom: "40px",
            lineHeight: 1.6,
          }}
        >
          Upload your documents, pay online, and collect your prints from any
          campus PrintPod. Fast, secure, and hassle-free.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link href="/login" className="btn-primary" style={{ width: "100%", textDecoration: "none", fontSize: "16px", padding: "14px 24px" }}>
            Get Started
          </Link>
          <Link href="/login" className="btn-secondary" style={{ width: "100%", textDecoration: "none" }}>
            I already have an account
          </Link>
        </div>

        <div
          style={{
            marginTop: "48px",
            display: "flex",
            justifyContent: "center",
            gap: "32px",
          }}
        >
          {[
            { icon: "📄", label: "Upload" },
            { icon: "💳", label: "Pay" },
            { icon: "🖨️", label: "Print" },
          ].map((step) => (
            <div key={step.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>
                {step.icon}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#6B7280",
                }}
              >
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
