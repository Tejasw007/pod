import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { type, token, code, orderId, podDbId } = await request.json();

    const supabaseAdmin = createAdminClient();

    // 1. Kiosk Manual 5-Digit Code Entry
    if (type === "CODE") {
      if (!code || !podDbId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      // Find order by code
      const { data: order } = await supabaseAdmin
        .from("print_orders")
        .select("id")
        .eq("pickup_code", code)
        .eq("status", "READY_FOR_PRINT")
        .single();

      if (!order) return NextResponse.json({ error: "Invalid code or order not ready" }, { status: 404 });

      // Connect order to pod
      await supabaseAdmin
        .from("print_orders")
        .update({ status: "POD_CONNECTED", pod_id: podDbId })
        .eq("id", order.id);

      return NextResponse.json({ success: true, orderId: order.id });
    }

    // 2. Student Phone QR Scan
    if (type === "TOKEN") {
      if (!token || !orderId) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      // Validate token
      const { data: session } = await supabaseAdmin
        .from("pod_sessions")
        .select("pod_id, is_active, expires_at")
        .eq("token", token)
        .single();

      if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
        return NextResponse.json({ error: "QR code expired or invalid" }, { status: 400 });
      }

      // Check auth
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      // Connect order to pod
      const { error } = await supabase
        .from("print_orders")
        .update({ status: "POD_CONNECTED", pod_id: session.pod_id })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "READY_FOR_PRINT");

      if (error) return NextResponse.json({ error: "Failed to connect order" }, { status: 400 });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Connect API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
