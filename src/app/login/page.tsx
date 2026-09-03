"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/upload";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

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
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Image
            src="/logo.png"
            alt="PrintPod"
            width={120}
            height={120}
            style={{ margin: "0 auto 16px", objectFit: "contain" }}
          />
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
            Sign in to your PrintPod account
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  marginBottom: "6px",
                  color: "#374151",
                }}
              >
                Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  marginBottom: "6px",
                  color: "#374151",
                }}
              >
                Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                textAlign: "right",
                marginBottom: "20px",
              }}
            >
              <a
                href="#"
                style={{
                  fontSize: "13px",
                  color: "var(--primary)",
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div
                style={{
                  background: "#FEE2E2",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "14px" }}
            >
              {loading ? (
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
