import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TABLE, parseKind, broadcastToPod } from "@/lib/podOrders";

// Per-workflow state names
const FLOW = {
  print: { running: "PRINTING", done: "PRINTED" },
  stationery: { running: "DISPENSING", done: "PICKED_UP" },
} as const;

export async function POST(request: Request) {
  try {
    const { orderId, action, orderType } = await request.json();
    if (!orderId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    const kind = parseKind(orderType);
    const flow = FLOW[kind];
    const supabaseAdmin = createAdminClient();

    // 1. HARDWARE SIMULATION (kiosk reports the job finished)
    if (action === "PRINT_COMPLETE" || action === "DISPENSE_COMPLETE") {
      const { data: order } = await supabaseAdmin
        .from(TABLE[kind])
        .select(kind === "print" ? "file_drive_id, pod_id" : "pod_id")
        .eq("id", orderId)
        .eq("status", flow.running)
        .single();

      if (!order) {
        return NextResponse.json({ error: `Order not ${flow.running.toLowerCase()}` }, { status: 400 });
      }
      const row = order as unknown as { file_drive_id?: string | null; pod_id: string | null };

      // Clean up the uploaded document once printed (PRD Section 20)
      if (kind === "print" && row.file_drive_id) {
        const { error: rmError } = await supabaseAdmin.storage
          .from("print_documents")
          .remove([row.file_drive_id]);
        if (rmError) console.error("Failed to delete file from Storage:", rmError);
      }

      const { data: updated } = await supabaseAdmin
        .from(TABLE[kind])
        .update({ status: flow.done })
        .eq("id", orderId)
        .eq("status", flow.running)
        .select("id")
        .maybeSingle();

      if (updated && row.pod_id) await broadcastToPod(row.pod_id, kind, orderId);
      return NextResponse.json({ success: true });
    }

    // 2. STUDENT CONFIRMATION (Confirm & Print / Confirm & Collect)
    if (action === "CONFIRM_PRINT" || action === "CONFIRM_DISPENSE") {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: updated, error } = await supabase
        .from(TABLE[kind])
        .update({ status: flow.running })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "POD_CONNECTED")
        .select("id, pod_id")
        .maybeSingle();

      if (error || !updated) {
        return NextResponse.json({ error: "Failed to start" }, { status: 400 });
      }

      if (updated.pod_id) await broadcastToPod(updated.pod_id, kind, orderId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Confirm API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
