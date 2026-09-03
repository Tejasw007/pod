import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generates a random 5-digit pickup code that doesn't collide
 * with any active (READY_FOR_PRINT) orders.
 */
export async function generatePickupCode(): Promise<string> {
  const supabase = createAdminClient();
  let code: string;
  let exists = true;

  // Keep generating until we find a unique code
  while (exists) {
    code = String(Math.floor(10000 + Math.random() * 90000));

    const { data } = await supabase
      .from("print_orders")
      .select("id")
      .eq("pickup_code", code)
      .in("status", [
        "READY_FOR_PRINT",
        "POD_CONNECTED",
        "AWAITING_CONFIRMATION",
        "PRINTING",
      ])
      .limit(1);

    exists = (data?.length ?? 0) > 0;
  }

  return code!;
}

/**
 * Validates a pickup code and returns the matching order.
 */
export async function validatePickupCode(code: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("print_orders")
    .select("*, profiles!print_orders_user_id_fkey(full_name, email)")
    .eq("pickup_code", code)
    .eq("status", "READY_FOR_PRINT")
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
