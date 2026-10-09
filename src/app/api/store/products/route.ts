import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STATIONERY_PRODUCTS } from "@/lib/stationery-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const supabase = await createClient();
    let query = supabase
      .from("stationery_products")
      .select("*")
      .eq("in_stock", true)
      .order("category")
      .order("name");

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return NextResponse.json({ products: data, source: "database" });
    }
  } catch (err) {
    console.warn("Supabase query error, falling back to local stationery catalog:", err);
  }

  // Graceful fallback to rich local catalog
  let filtered = STATIONERY_PRODUCTS.filter((p) => p.in_stock);
  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.category === category);
  }

  return NextResponse.json({ products: filtered, source: "catalog" });
}
