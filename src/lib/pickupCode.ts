import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRINT_ACTIVE, STATIONERY_ACTIVE } from "@/lib/types";

/**
 * Generates a random 5-digit pickup code that doesn't collide with any active
 * print OR stationery order (the kiosk looks codes up across both).
 */
export async function generatePickupCode(): Promise<string> {
  const supabase = createAdminClient();

  // Bounded retries so a DB outage can't spin forever
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(randomInt(10000, 100000));

    const [prints, stationery] = await Promise.all([
      supabase
        .from("print_orders")
        .select("id")
        .eq("pickup_code", code)
        .in("status", PRINT_ACTIVE)
        .limit(1),
      supabase
        .from("stationery_orders")
        .select("id")
        .eq("pickup_code", code)
        .in("status", STATIONERY_ACTIVE)
        .limit(1),
    ]);

    if (prints.error) throw prints.error;
    if (stationery.error) throw stationery.error;
    if (!prints.data?.length && !stationery.data?.length) return code;
  }

  throw new Error("Could not generate a unique pickup code");
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
