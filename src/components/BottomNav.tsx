"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on kiosk, login, register, connect, and page root
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/kiosk") ||
    pathname.startsWith("/connect")
  ) {
    return null;
  }

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "white",
      borderTop: "1px solid var(--border)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      zIndex: 40,
    }}>
      <Link href="/upload" style={{
        flex: 1,
        textAlign: "center",
        padding: "12px 0",
        color: pathname === "/upload" ? "var(--primary)" : "var(--text-secondary)",
        textDecoration: "none",
        fontWeight: pathname === "/upload" ? 600 : 500,
        fontSize: "12px",
      }}>
        <div style={{ fontSize: "18px", marginBottom: "2px" }}>📄</div>
        Print
      </Link>

      <Link href="/store" style={{
        flex: 1,
        textAlign: "center",
        padding: "12px 0",
        color: pathname === "/store" || pathname === "/cart" ? "var(--primary)" : "var(--text-secondary)",
        textDecoration: "none",
        fontWeight: pathname === "/store" || pathname === "/cart" ? 600 : 500,
        fontSize: "12px",
      }}>
        <div style={{ fontSize: "18px", marginBottom: "2px" }}>🛒</div>
        Store
      </Link>

      <Link href="/orders" style={{
        flex: 1,
        textAlign: "center",
        padding: "12px 0",
        color: pathname === "/orders" ? "var(--primary)" : "var(--text-secondary)",
        textDecoration: "none",
        fontWeight: pathname === "/orders" ? 600 : 500,
        fontSize: "12px",
      }}>
        <div style={{ fontSize: "18px", marginBottom: "2px" }}>📋</div>
        Orders
      </Link>
    </div>
  );
}
