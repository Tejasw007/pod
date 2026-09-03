import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const copies = parseInt(formData.get("copies") as string, 10);
    const paperSize = formData.get("paperSize") as string;
    const colorMode = formData.get("colorMode") as string;
    const printSide = formData.get("printSide") as string;
    const pages = parseInt(formData.get("pages") as string, 10);
    const total = parseFloat(formData.get("total") as string);

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Get auth user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {}, // Handled by middleware
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    let fileDriveId = null;
    let fileDriveLink = null;
    
    try {
      const supabaseAdmin = createAdminClient();
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('print_documents')
        .upload(uniqueFileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('print_documents')
        .getPublicUrl(uniqueFileName);

      fileDriveId = uniqueFileName;
      fileDriveLink = publicUrl;
    } catch (e) {
      console.error("Supabase Storage Upload Failed:", e);
    }

    // Insert order into Supabase
    const { data: order, error } = await supabase
      .from("print_orders")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_drive_id: fileDriveId,
        file_drive_link: fileDriveLink,
        file_size_bytes: file.size,
        page_count: pages,
        copies,
        paper_size: paperSize,
        color_mode: colorMode,
        print_side: printSide,
        total_price: total,
        status: "PAYMENT_PENDING"
      })
      .select()
      .single();

    if (error) {
      console.error("DB Insert Error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error("Order API Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
