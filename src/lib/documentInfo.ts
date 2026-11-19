"use client";

// Client-side page counting + type detection for the upload page.
// Page count used to be `file.size / 500 KB`, which made phone photos
// (3-8 MB each) look like 6-16 pages and inflated the price.

export type DocKind = "pdf" | "image" | "docx" | "pptx" | "text" | "other";

export interface DocInfo {
  kind: DocKind;
  pages: number;
  /** true when the count was read from the file; false when it's a guess the user should confirm */
  exact: boolean;
}

export function detectKind(name: string, mime = ""): DocKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext) || mime.startsWith("image/")) return "image";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  if (ext === "txt" || mime === "text/plain") return "text";
  return "other";
}

export async function loadPdf(source: File | string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const data = typeof source === "string" ? undefined : new Uint8Array(await source.arrayBuffer());
  return pdfjs.getDocument(data ? { data } : { url: source as string }).promise;
}

export async function analyzeDocument(file: File): Promise<DocInfo> {
  const kind = detectKind(file.name, file.type);

  try {
    if (kind === "pdf") {
      const pdf = await loadPdf(file);
      const pages = pdf.numPages;
      await pdf.destroy();
      return { kind, pages: Math.max(1, pages), exact: true };
    }

    if (kind === "image") return { kind, pages: 1, exact: true };

    if (kind === "docx" || kind === "pptx") {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(await file.arrayBuffer());

      if (kind === "pptx") {
        const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
        if (slides.length > 0) return { kind, pages: slides.length, exact: true };
      } else {
        const xml = await zip.file("docProps/app.xml")?.async("string");
        const m = xml?.match(/<Pages>(\d+)<\/Pages>/);
        if (m && Number(m[1]) > 0) return { kind, pages: Number(m[1]), exact: true };
      }
    }

    if (kind === "text") {
      const text = await file.text();
      return { kind, pages: Math.max(1, Math.ceil(text.split("\n").length / 50)), exact: false };
    }
  } catch (err) {
    console.warn("Could not read page count:", err);
  }

  // Unknown format: assume a single page and let the user correct it.
  return { kind, pages: 1, exact: false };
}
