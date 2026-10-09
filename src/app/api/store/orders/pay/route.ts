import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // 5-digit pickup code (matching storyboard panels 6 and 7: 48291 / PD1024)
    const pickupCode = String(Math.floor(10000 + Math.random() * 90000));

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("stationery_orders")
          .update({
            status: "PAID",
            payment_id: "pay_" + Date.now(),
            pickup_code: pickupCode,
          })
          .eq("id", orderId);
      }
    } catch (err) {
      console.warn("Supabase payment update failed, using generated code:", err);
    }

    return NextResponse.json({ success: true, pickupCode, orderId });
  } catch (err) {
    console.error("Stationery Payment API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
