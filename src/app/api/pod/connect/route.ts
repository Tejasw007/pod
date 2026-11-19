import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TABLE, READY_STATUS, parseKind, broadcastToPod } from "@/lib/podOrders";
import type { OrderKind } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { type, token, code, orderId, podDbId, orderType } = await request.json();
    const supabaseAdmin = createAdminClient();

    // 1. Kiosk manual 5-digit code entry (print and stationery share the code space)
    if (type === "CODE") {
      if (typeof code !== "string" || !/^\d{5}$/.test(code) || !podDbId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      for (const kind of ["print", "stationery"] as OrderKind[]) {
        const { data: order } = await supabaseAdmin
          .from(TABLE[kind])
          .select("id")
          .eq("pickup_code", code)
          .eq("status", READY_STATUS[kind])
          .maybeSingle();
        if (!order) continue;

        const { data: updated } = await supabaseAdmin
          .from(TABLE[kind])
          .update({ status: "POD_CONNECTED", pod_id: podDbId })
          .eq("id", order.id)
          .eq("status", READY_STATUS[kind])
          .select("id")
          .maybeSingle();
        if (!updated) continue;

        await broadcastToPod(podDbId, kind, order.id);
        return NextResponse.json({ success: true, orderId: order.id, orderType: kind });
      }

      return NextResponse.json({ error: "Invalid code or order not ready" }, { status: 404 });
    }

    // 2. Student phone QR scan
    if (type === "TOKEN") {
      if (!token || !orderId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }
      const kind = parseKind(orderType);

      const { data: session } = await supabaseAdmin
        .from("pod_sessions")
        .select("pod_id, is_active, expires_at")
        .eq("token", token)
        .single();

      if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
        return NextResponse.json({ error: "QR code expired or invalid" }, { status: 400 });
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: updated, error } = await supabase
        .from(TABLE[kind])
        .update({ status: "POD_CONNECTED", pod_id: session.pod_id })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", READY_STATUS[kind])
        .select("id")
        .maybeSingle();

      if (error || !updated) {
        return NextResponse.json({ error: "Failed to connect order" }, { status: 400 });
      }

      await broadcastToPod(session.pod_id, kind, orderId);
      return NextResponse.json({ success: true, orderType: kind });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Connect API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
