"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Presentation, FileQuestion } from "lucide-react";
import { detectKind, loadPdf } from "@/lib/documentInfo";

const PAPER_RATIO: Record<string, number> = {
  A4: 1 / 1.414,
  A3: 1 / 1.414,
  Letter: 8.5 / 11,
};

interface Props {
  /** A local file (upload page) or a URL (kiosk) */
  source: File | string;
  fileName: string;
  paperSize?: string;
  colorMode?: string;
  /** Called once the real page count is known */
  onPageCount?: (n: number) => void;
  /** Max rendered width in CSS px */
  maxWidth?: number;
}

export default function DocumentPreview({
  source,
  fileName,
  paperSize = "A4",
  colorMode = "bw",
  onPageCount,
  maxWidth = 320,
}: Props) {
  const kind = detectKind(fileName, typeof source === "string" ? "" : source.type);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageNo, setPageNo] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [failed, setFailed] = useState(false);
  const [rendering, setRendering] = useState(kind === "pdf");
  const [pdf, setPdf] = useState<Awaited<ReturnType<typeof loadPdf>> | null>(null);

  const imageUrl = useMemo(
    () => (kind === "image" ? (typeof source === "string" ? source : URL.createObjectURL(source)) : null),
    [kind, source]
  );
  useEffect(() => {
    return () => {
      if (imageUrl && typeof source !== "string") URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl, source]);

  // Load the PDF once per source
  useEffect(() => {
    if (kind !== "pdf") return;
    let cancelled = false;
    let doc: Awaited<ReturnType<typeof loadPdf>> | null = null;
    loadPdf(source)
      .then((d) => {
        if (cancelled) return d.destroy();
        doc = d;
        setPdf(d);
        setNumPages(d.numPages);
        onPageCount?.(d.numPages);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      doc?.destroy();
    };
    // onPageCount intentionally omitted: it is a notification, not an input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, source]);

  // Render the current page, sharp on high-DPI screens
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        const page = await pdf.getPage(pageNo);
        const base = page.getViewport({ scale: 1 });
        const scale = (maxWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNo, maxWidth]);

  const ratio = PAPER_RATIO[paperSize] ?? PAPER_RATIO.A4;
  // B&W jobs show what will actually come out of the printer
  const filter = colorMode === "bw" ? "grayscale(100%) contrast(1.05)" : "none";

  const frame: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth,
    margin: "0 auto",
    aspectRatio: String(ratio),
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
    overflow: "hidden",
  };

  const placeholder = (icon: React.ReactNode, text: string) => (
    <div style={{ ...frame, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", background: "var(--surface)", color: "var(--text-secondary)", padding: "16px", textAlign: "center" }}>
      {icon}
      <div style={{ fontSize: "13px", fontWeight: 600, wordBreak: "break-all" }}>{fileName}</div>
      <div style={{ fontSize: "12px" }}>{text}</div>
    </div>
  );

  let body: React.ReactNode;
  if (failed) {
    body = placeholder(<FileQuestion size={36} strokeWidth={1.5} />, "Preview unavailable. Your file will still print as uploaded.");
  } else if (kind === "pdf") {
    body = (
      <div style={frame}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "contain", filter, display: "block" }} />
        {rendering && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)" }}>
            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
          </div>
        )}
      </div>
    );
  } else if (kind === "image" && imageUrl) {
    body = (
      <div style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={fileName} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain", filter }} />
      </div>
    );
  } else if (kind === "pptx") {
    body = placeholder(<Presentation size={36} strokeWidth={1.5} />, "Slides can't be previewed in the browser.");
  } else if (kind === "docx" || kind === "text") {
    body = placeholder(<FileText size={36} strokeWidth={1.5} />, "Document preview isn't available for this file type.");
  } else {
    body = placeholder(<FileQuestion size={36} strokeWidth={1.5} />, "Preview not available for this file type.");
  }

  return (
    <div>
      {body}
      {kind === "pdf" && !failed && numPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", marginTop: "12px" }}>
          <button type="button" className="stepper-btn" onClick={() => setPageNo((p) => Math.max(1, p - 1))} disabled={pageNo <= 1} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            Page {pageNo} / {numPages}
          </span>
          <button type="button" className="stepper-btn" onClick={() => setPageNo((p) => Math.min(numPages, p + 1))} disabled={pageNo >= numPages} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
        {paperSize} • {colorMode === "bw" ? "Black & white preview" : "Colour"}
      </div>
    </div>
  );
}
