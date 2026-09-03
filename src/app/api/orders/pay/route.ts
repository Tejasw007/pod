import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generatePickupCode } from "@/lib/pickupCode";

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate unique 5-digit pickup code
    const pickupCode = await generatePickupCode();

    // Update order state to READY_FOR_PRINT and assign code
    const { data: order, error } = await supabase
      .from("print_orders")
      .update({
        status: "READY_FOR_PRINT",
        payment_id: "mock_pay_" + Date.now(),
        pickup_code: pickupCode,
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("status", "PAYMENT_PENDING")
      .select()
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found or invalid state" }, { status: 400 });
    }

    return NextResponse.json({ success: true, pickupCode });
  } catch (err) {
    console.error("Payment API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
