import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePickupCode } from "@/lib/pickupCode";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    if (typeof orderId !== "string" || !orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unique 5-digit pickup code (shared namespace with print orders)
    const pickupCode = await generatePickupCode();

    // Only the owner can pay, and only an order that is still unpaid.
    const { data: order, error } = await supabase
      .from("stationery_orders")
      .update({
        status: "READY_FOR_PICKUP",
        payment_id: "mock_pay_" + Date.now(),
        pickup_code: pickupCode,
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("status", "PAYMENT_PENDING")
      .select("id")
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found or invalid state" }, { status: 400 });
    }

    return NextResponse.json({ success: true, pickupCode, orderId });
  } catch (err) {
    console.error("Stationery Payment API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
