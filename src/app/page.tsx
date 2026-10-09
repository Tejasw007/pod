import Link from "next/link";
import Image from "next/image";
import { Upload, ShoppingBag, Printer, ArrowRight } from "lucide-react";

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
            marginBottom: "40px",
            lineHeight: 1.5,
          }}
        >
          Upload documents, buy stationery & collect everything at any campus PrintPod.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          <Link href="/login" className="btn-primary" style={{ width: "100%", textDecoration: "none", fontSize: "16px", padding: "14px 24px" }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-secondary" style={{ width: "100%", textDecoration: "none" }}>
            Create Account
          </Link>
        </div>

        {/* Two-path cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            borderTop: "1px solid var(--border)",
            paddingTop: "32px",
          }}
        >
          <Link
            href="/upload"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: "24px 16px",
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface)",
              borderRadius: "12px",
            }}>
              <Printer size={24} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>Print</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Upload & print documents
              </div>
            </div>
          </Link>

          <Link
            href="/store"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: "24px 16px",
              background: "white",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface)",
              borderRadius: "12px",
            }}>
              <ShoppingBag size={24} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>Store</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Notebooks, pens, A4 sheets & more
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
