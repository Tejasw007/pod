import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderKind } from "@/lib/types";

export const TABLE: Record<OrderKind, "print_orders" | "stationery_orders"> = {
  print: "print_orders",
  stationery: "stationery_orders",
};

/** Status an order must be in before a pod can pick it up. */
export const READY_STATUS: Record<OrderKind, string> = {
  print: "READY_FOR_PRINT",
  stationery: "READY_FOR_PICKUP",
};

export function parseKind(value: unknown): OrderKind {
  return value === "stationery" ? "stationery" : "print";
}

/** Fetch an order with whatever the kiosk needs to display it. */
export async function fetchOrderForKiosk(kind: OrderKind, orderId: string) {
  const admin = createAdminClient();
  const select =
    kind === "print"
      ? "*"
      : "*, stationery_order_items(id, quantity, unit_price, stationery_products(name))";
  const { data } = await admin.from(TABLE[kind]).select(select).eq("id", orderId).single();
  if (!data) return null;
  const order = data as unknown as { user_id: string } & Record<string, unknown>;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", order.user_id)
    .single();

  return { ...order, order_type: kind, user_name: profile?.full_name || "Student" };
}

/** Push the latest order state to the kiosk listening on this pod. */
export async function broadcastToPod(podDbId: string, kind: OrderKind, orderId: string) {
  const payload = await fetchOrderForKiosk(kind, orderId);
  if (!payload) return;
  const admin = createAdminClient();
  const channel = admin.channel(`pod_${podDbId}`);
  try {
    await channel.send({ type: "broadcast", event: "order_update", payload });
  } finally {
    await admin.removeChannel(channel);
  }
}
