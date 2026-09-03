import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { cookies } from "next/headers";
export async function POST(request: Request) {
  try {
    const { orderId, action } = await request.json();
    if (!orderId || !action) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const supabaseAdmin = createAdminClient();

    // 1. HARDWARE SIMULATION (Kiosk calls PRINT_COMPLETE)
    if (action === "PRINT_COMPLETE") {
      const { data: order } = await supabaseAdmin
        .from("print_orders")
        .select("file_drive_id, pod_id")
        .eq("id", orderId)
        .eq("status", "PRINTING")
        .single();

      if (!order) return NextResponse.json({ error: "Order not printing" }, { status: 400 });

      // Clean up file from Supabase Storage as per PRD Section 20
      if (order.file_drive_id) {
        try {
          await supabaseAdmin.storage.from('print_documents').remove([order.file_drive_id]);
          console.log(`Deleted file ${order.file_drive_id} from Storage for order ${orderId}`);
        } catch (e) {
          console.error("Failed to delete file from Storage:", e);
        }
      }

      // Mark as PRINTED
      const { data: updatedOrder } = await supabaseAdmin
        .from("print_orders")
        .update({ status: "PRINTED" })
        .eq("id", orderId)
        .select()
        .single();

      if (updatedOrder && order.pod_id) {
        await supabaseAdmin.channel(`pod_${order.pod_id}`).send({
          type: "broadcast",
          event: "order_update",
          payload: updatedOrder
        });
      }

      return NextResponse.json({ success: true });
    }

    // 2. STUDENT PHONE CONFIRMATION (Student clicks CONFIRM & PRINT)
    if (action === "CONFIRM_PRINT") {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: updatedOrder, error } = await supabase
        .from("print_orders")
        .update({ status: "PRINTING" })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "POD_CONNECTED")
        .select()
        .single();

      if (error) return NextResponse.json({ error: "Failed to start printing" }, { status: 400 });

      if (updatedOrder && updatedOrder.pod_id) {
        await supabaseAdmin.channel(`pod_${updatedOrder.pod_id}`).send({
          type: "broadcast",
          event: "order_update",
          payload: updatedOrder
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Confirm API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
