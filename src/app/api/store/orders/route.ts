import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Never trust client-supplied prices: resolve each item from the product
    // table. The local catalog only has non-UUID ids, so it can't back a
    // real order line item (product_id is a UUID foreign key).
    const { data: products, error: productsError } = await supabase
      .from("stationery_products")
      .select("id, price, in_stock");
    if (productsError) {
      console.error("Product lookup failed:", productsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    const productById = new Map(
      (products ?? []).map((p) => [p.id as string, { price: Number(p.price), inStock: Boolean(p.in_stock) }])
    );

    const merged = new Map<string, number>();
    for (const item of items as { productId?: unknown; quantity?: unknown }[]) {
      const quantity = Number(item.quantity ?? 1);
      const product = typeof item.productId === "string" ? productById.get(item.productId) : undefined;
      if (!product || !product.inStock || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
      }
      merged.set(item.productId as string, (merged.get(item.productId as string) ?? 0) + quantity);
    }

    const lineItems = [...merged].map(([productId, quantity]) => ({
      product_id: productId,
      quantity,
      unit_price: productById.get(productId)!.price,
    }));
    const totalPrice = lineItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

    const { data: order, error: orderError } = await supabase
      .from("stationery_orders")
      .insert({ user_id: user.id, status: "PAYMENT_PENDING", total_price: totalPrice })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Stationery order insert failed:", orderError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const { error: itemsError } = await supabase
      .from("stationery_order_items")
      .insert(lineItems.map((i) => ({ ...i, order_id: order.id })));

    if (itemsError) {
      console.error("Stationery items insert failed:", itemsError);
      // Don't leave an empty order behind
      await supabase.from("stationery_orders").update({ status: "CANCELLED" }).eq("id", order.id);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id, total: totalPrice });
  } catch (err) {
    console.error("Stationery Order API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
