import os
from PIL import Image, ImageDraw, ImageFont
import pygments
from pygments.formatters import ImageFormatter
from pygments import highlight
from pygments.lexers import TypeScriptLexer

test_code = """\"use client\";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, FileText, CheckCircle } from "lucide-react";

export default function DocumentUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");

  // Dynamic real-time rate calculation
  const pages = file ? Math.max(1, Math.floor(file.size / 500000)) : 1;
  const ratePerPage = colorMode === "bw" ? 2 : 10;
  const totalCost = pages * copies * ratePerPage;

  return (
    <div className="upload-container">
      <div className="price-badge">₹{totalCost} Total</div>
    </div>
  );
}"""

formatter = ImageFormatter(
    font_name="Consolas",
    font_size=16,
    line_numbers=True,
    line_number_bg="#1e1e2e",
    line_number_fg="#6c7086",
    style="one-dark"
)

raw_png = highlight(test_code, TypeScriptLexer(), formatter)
os.makedirs("report_code_snippets", exist_ok=True)
with open("report_code_snippets/test_raw.png", "wb") as f:
    f.write(raw_png)

print("Saved raw code image!")
