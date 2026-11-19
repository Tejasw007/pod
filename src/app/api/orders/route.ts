import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "../../../lib/supabase/admin";
import { cookies } from "next/headers";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const PAPER_SIZES = ["A4", "A3", "Letter"];
const COLOR_MODES = ["bw", "color"];
const PRINT_SIDES = ["single", "duplex"];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const copies = parseInt(formData.get("copies") as string, 10);
    const paperSize = formData.get("paperSize") as string;
    const colorMode = formData.get("colorMode") as string;
    const printSide = formData.get("printSide") as string;
    let pages = parseInt(formData.get("pages") as string, 10);

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 413 });
    }
    if (
      !Number.isInteger(copies) || copies < 1 || copies > 10 ||
      !Number.isInteger(pages) || pages < 1 || pages > 2000 ||
      !PAPER_SIZES.includes(paperSize) ||
      !COLOR_MODES.includes(colorMode) ||
      !PRINT_SIDES.includes(printSide)
    ) {
      return NextResponse.json({ error: "Invalid print options" }, { status: 400 });
    }
    // For PDFs the server reads the real page count, so the client can't
    // under-report pages to pay less.
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        // Loaded lazily: if the PDF library can't start in this runtime, the
        // order must still go through with the client-reported page count.
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
        const info = await parser.getInfo();
        await parser.destroy();
        if (info.total > 0) pages = info.total;
      } catch (e) {
        console.warn("PDF page count failed, using client value:", e);
      }
    }
    // Price is computed server-side; the client-supplied total is ignored.
    const total = pages * copies * (colorMode === "bw" ? 2 : 10);

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
    const fileExt = (file.name.split(".").pop() ?? "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
    const uniqueFileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    let fileDriveId = null;
    let fileDriveLink = null;
    
    try {
      const supabaseAdmin = createAdminClient();
      const { error: uploadError } = await supabaseAdmin.storage
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
      return NextResponse.json({ error: "File upload failed" }, { status: 502 });
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
