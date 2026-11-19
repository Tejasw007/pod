import os
from PIL import Image, ImageDraw, ImageFont
import pygments
from pygments.formatters import ImageFormatter
from pygments import highlight
from pygments.lexers import TypeScriptLexer

os.makedirs("report_code_snippets", exist_ok=True)

def create_ide_screenshot(code_text: str, filename: str, tab_title: str, output_path: str):
    # 1. Generate highlighted code image using Pygments
    formatter = ImageFormatter(
        font_name="Consolas",
        font_size=15,
        line_numbers=True,
        line_number_bg="#1e1e2e",
        line_number_fg="#5c6370",
        style="one-dark"
    )
    code_png_bytes = highlight(code_text, TypeScriptLexer(), formatter)
    
    # Save temp and open in PIL
    temp_code_path = output_path + ".tmp.png"
    with open(temp_code_path, "wb") as f:
        f.write(code_png_bytes)
    code_img = Image.open(temp_code_path)

    # 2. Frame dimensions
    header_height = 42
    padding_x = 24
    padding_bottom = 20
    border_radius = 12

    total_width = code_img.width + (padding_x * 2)
    total_height = code_img.height + header_height + padding_bottom

    # 3. Create canvas with modern dark background
    # Background color: #1e1e2e (Catppuccin Mocha / modern dark IDE)
    bg_color = (30, 30, 46)
    header_color = (24, 24, 37)
    border_color = (69, 71, 90)

    canvas = Image.new("RGBA", (total_width, total_height), bg_color)
    draw = ImageDraw.Draw(canvas)

    # Draw header bar
    draw.rectangle([(0, 0), (total_width, header_height)], fill=header_color)
    draw.line([(0, header_height), (total_width, header_height)], fill=border_color, width=1)

    # Draw macOS / modern window control buttons (red, yellow, green)
    btn_y = 21
    draw.ellipse([(18, btn_y - 6), (30, btn_y + 6)], fill=(255, 95, 86))    # Red
    draw.ellipse([(38, btn_y - 6), (50, btn_y + 6)], fill=(255, 189, 46))   # Yellow
    draw.ellipse([(58, btn_y - 6), (70, btn_y + 6)], fill=(39, 201, 63))    # Green

    # Window title / Tab text
    try:
        title_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
        code_tag_font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 11)
    except:
        title_font = ImageFont.load_default()
        code_tag_font = ImageFont.load_default()

    # Draw tab badge
    tab_x = 90
    tab_w = 360
    draw.rounded_rectangle([(tab_x, 8), (tab_x + tab_w, 34)], radius=6, fill=(30, 30, 46), outline=border_color)
    draw.text((tab_x + 16, 13), tab_title, fill=(205, 214, 244), font=title_font)
    
    # Draw right badge: "FRONTEND ONLY • REACT / NEXT.JS"
    badge_text = "FRONTEND CLIENT COMPONENT"
    badge_x = total_width - 230
    draw.rounded_rectangle([(badge_x, 10), (total_width - 16, 32)], radius=4, fill=(49, 50, 68))
    draw.text((badge_x + 12, 14), badge_text, fill=(166, 227, 161), font=code_tag_font)

    # 4. Paste highlighted code image
    canvas.paste(code_img, (padding_x, header_height + 10))

    # 5. Draw border around entire frame
    draw.rounded_rectangle([(0, 0), (total_width - 1, total_height - 1)], radius=border_radius, outline=border_color, width=1)

    # 6. Save final image
    canvas.save(output_path, "PNG")
    if os.path.exists(temp_code_path):
        os.remove(temp_code_path)
    print(f"Generated screenshot: {output_path} ({total_width}x{total_height})")

# Test snippets
snippet_1 = '''"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, FileText, CheckCircle } from "lucide-react";

export default function DocumentUploadCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Client-side print parameter configurations
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<"A4" | "A3">("A4");
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [printSide, setPrintSide] = useState<"single" | "double">("single");

  // Dynamic real-time rate & price estimation
  const pages = file ? Math.max(1, Math.floor(file.size / 500000)) : 0;
  const ratePerPage = colorMode === "bw" ? 2 : 10;
  const totalCost = pages * copies * ratePerPage;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="upload-container">
      <div className={`dropzone ${isDragging ? "active" : ""}`} onDrop={handleDrop}>
        <FileUp size={44} className="text-primary" />
        <p className="font-semibold">Drag & drop your document here</p>
        <span className="text-muted">Supported: PDF, DOCX (Max 100MB)</span>
      </div>
      <div className="price-estimation-badge">
        <span>Calculated: {pages} pages × {copies} copy</span>
        <span className="total-amount">₹{totalCost} Total</span>
      </div>
    </div>
  );
}'''

snippet_2 = '''"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Printer, ShoppingBag, CheckCircle, Clock } from "lucide-react";

export default function OrdersDashboard() {
  const [printOrders, setPrintOrders] = useState<any[]>([]);
  const [stationeryOrders, setStationeryOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<"print" | "stationery">("print");
  const [loading, setLoading] = useState<boolean>(true);
  const supabase = createClient();

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time WebSocket broadcast channel for instantaneous updates
    const printChannel = supabase
      .channel("orders_channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "print_orders" },
        (payload: any) => {
          // Zero-reload sub-second reactive state update on client
          setPrintOrders((prev) =>
            prev.map((order) =>
              order.id === payload.new.id ? { ...order, status: payload.new.status } : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(printChannel);
    };
  }, [supabase]);

  return (
    <div className="orders-wrapper">
      <div className="tab-pill-selector">
        <button className={tab === "print" ? "active" : ""} onClick={() => setTab("print")}>
          Print Jobs ({printOrders.length})
        </button>
        <button className={tab === "stationery" ? "active" : ""} onClick={() => setTab("stationery")}>
          Stationery Orders ({stationeryOrders.length})
        </button>
      </div>
    </div>
  );
}'''

snippet_3 = '''"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Search, Check } from "lucide-react";
import { addToCart, getCart, getCartCount, type CartItem } from "@/lib/cart";

export default function StoreCatalog() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartCount, setCartCount] = useState<number>(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Client-side cart addition with tactile visual feedback
  const handleAddToCart = (product: Product) => {
    const updatedCart = addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
    });
    setCartCount(getCartCount(updatedCart));
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 800); // 800ms success animation
  };

  // Instant client-side catalog filtering
  const filteredProducts = products.filter((item) => {
    const matchCategory = activeCategory === "all" || item.category === activeCategory;
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="store-container">
      <div className="category-pills">
        {["all", "paper", "notebooks", "writing", "essentials"].map((cat) => (
          <button key={cat} className={activeCategory === cat ? "pill-active" : "pill"} onClick={() => setActiveCategory(cat)}>
            {cat.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}'''

snippet_4 = '''"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { Printer, Smartphone, ShieldCheck, Keypad } from "lucide-react";

export default function KioskTerminalUI() {
  const { podId } = useParams();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [pinCode, setPinCode] = useState<string[]>(["", "", "", "", ""]);
  const [statusText, setStatusText] = useState<string>("Ready • Scan QR or Enter PIN");
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Periodically refresh dynamic cryptographic session QR code (60s token TTL)
  useEffect(() => {
    initKioskSession();
    const interval = setInterval(initKioskSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [podId]);

  // Dual-modal fallback: 5-digit numeric PIN input handler with auto-focus advancing
  const handlePinDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const updatedPin = [...pinCode];
    updatedPin[index] = val.slice(-1);
    setPinCode(updatedPin);
    if (val && index < 4) {
      pinInputRefs.current[index + 1]?.focus(); // Auto-advance focus to next digit box
    }
  };

  return (
    <div className="kiosk-touchscreen-grid">
      {/* Primary: Dynamic High-Contrast QR Display */}
      <div className="qr-panel">
        {qrDataUrl && <img src={qrDataUrl} alt="Session QR" className="qr-code-img" />}
        <p className="kiosk-instruction">Scan with PrintPod Mobile Web App</p>
      </div>

      {/* Fallback: Physical Glare-Resistant 5-Digit PIN Keypad Entry */}
      <div className="pin-fallback-panel">
        <h3 className="keypad-title">Or Enter 5-Digit Pickup PIN</h3>
        <div className="pin-digits-row">
          {pinCode.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (pinInputRefs.current[idx] = el)}
              value={digit}
              maxLength={1}
              onChange={(e) => handlePinDigitChange(idx, e.target.value)}
              className="pin-box"
            />
          ))}
        </div>
      </div>
    </div>
  );
}'''

create_ide_screenshot(snippet_1, "upload_pricing.png", "src/app/upload/page.tsx — Document Upload & Live Pricing", "report_code_snippets/snippet_1_upload_pricing.png")
create_ide_screenshot(snippet_2, "orders_realtime.png", "src/app/orders/page.tsx — Supabase Realtime WebSocket Listener", "report_code_snippets/snippet_2_orders_realtime.png")
create_ide_screenshot(snippet_3, "store_cart.png", "src/app/store/page.tsx — Catalog Filtering & Persistent Cart Engine", "report_code_snippets/snippet_3_store_cart.png")
create_ide_screenshot(snippet_4, "kiosk_handshake.png", "src/app/kiosk/[podId]/page.tsx — Dual Handshake & PIN Fallback UI", "report_code_snippets/snippet_4_kiosk_handshake.png")
