"use client";

import React, { useState, useRef } from "react";
import styles from "./ReceiptPrinter.module.css";
import html2canvas from "html2canvas";

export interface ReceiptLine {
  label: string;
  amount?: number;
}

interface ReceiptPrinterProps {
  orderId: string;
  /** One receipt row per line item (a document, or each stationery product) */
  lines: ReceiptLine[];
  kind?: "print" | "stationery";
  grandTotal: number;
  pickupCode?: string;
  onTorn?: () => void;
}

export default function ReceiptPrinter({
  orderId,
  lines,
  kind = "print",
  grandTotal,
  pickupCode,
  onTorn,
}: ReceiptPrinterProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const [isTearing, setIsTearing] = useState(false);
  const [isTorn, setIsTorn] = useState(false);
  // Random barcode widths, generated once on mount (this component only
  // renders client-side, after the order has been fetched)
  const [barcodeSpans] = useState<number[]>(() =>
    Array.from({ length: 40 }).map(() => (Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1))
  );

  const receiptRef = useRef<HTMLDivElement>(null);

  const today = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  const startPrinting = () => {
    if (isPrinting) return;

    setIsPrinting(false);
    setIsStamped(false);
    setIsTearing(false);
    setIsTorn(false);

    setTimeout(() => {
      setIsPrinting(true);

      setTimeout(() => {
        setIsStamped(true);
      }, 2500);
    }, 100);
  };

  const tearReceipt = async () => {
    if (receiptRef.current) {
      try {
        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: "#FFFFFF",
          scale: 2,
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `PrintPod-Receipt-${orderId}.png`;
        link.href = image;
        link.click();
      } catch (err) {
        console.error("Failed to save receipt image", err);
      }
    }

    setIsTearing(true);
    setTimeout(() => {
      setIsTorn(true);
      if (onTorn) onTorn();
    }, 800);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className={styles.stage}>
        <div className={styles.printerWrap}>
          <div className={styles.printer}></div>
          <div className={styles.feedContainer}>
            <div
              className={`${styles.feed} ${
                isPrinting ? styles.printing : ""
              } ${isStamped ? styles.stamped : ""}`}
              style={{
                height: isPrinting ? `${320 + Math.max(0, lines.length - 2) * 24}px` : "0",
              }}
            >
              <div
                ref={receiptRef}
                className={`${styles.receipt} ${
                  isTearing ? styles.tearing : ""
                }`}
              >
                <div className={styles.stamp}>
                  PAID
                  <small>{today}</small>
                </div>

                <div className={styles.rBrand}>
                  <span className={styles.name}>PRINTPOD</span>
                  <span className={styles.mark}>P</span>
                </div>

                <div className={styles.rSub}>Order #{orderId.slice(0, 8)}</div>

                <div className="mb-4">
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className={styles.rLine}
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <span>{line.label}</span>
                      {line.amount !== undefined && <span>₹{line.amount}</span>}
                    </div>
                  ))}
                </div>

                <div className={styles.rTotalBlock}>
                  <div
                    className={styles.rLine}
                    style={{ "--i": lines.length } as React.CSSProperties}
                  >
                    <span>Subtotal</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                <div className={styles.rGrand}>
                  <span>TOTAL PAID</span>
                  <span>₹{grandTotal}</span>
                </div>

                <div className={styles.rThanks}>{kind === "print" ? "Ready for Print!" : "Ready for Pickup!"}</div>

                <div className={styles.barcode}>
                  {barcodeSpans.map((w, i) => (
                    <span
                      key={i}
                      style={{
                        width: w + "px",
                        transitionDelay: 1.8 + i * 0.01 + "s",
                      }}
                    ></span>
                  ))}
                </div>
                <div className={styles.orderId}>TXN-{orderId.slice(0, 8)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center w-full">
          {!isPrinting && !isTorn && (
            <>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Payment Successful
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginBottom: "24px",
                }}
              >
                {kind === "print" ? "Your print order is ready." : "Your stationery order is ready."}
              </div>
            </>
          )}
          {isPrinting && !isStamped && (
            <>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Printing Receipt...
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "transparent",
                  marginBottom: "24px",
                }}
              >
                ...
              </div>
            </>
          )}
          {isStamped && !isTearing && !isTorn && (
            <>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Print Complete
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginBottom: "24px",
                }}
              >
                Tear the receipt to proceed.
              </div>
            </>
          )}
          {isTorn && (
            <>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Order Confirmed!
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginBottom: "16px",
                }}
              >
                {kind === "print" ? "Head to any PrintPod to collect your print." : "Head to any PrintPod to collect your items."}
              </div>
              {pickupCode && (
                <div style={{ background: "var(--surface-dim)", padding: "16px", borderRadius: "12px", display: "inline-block", marginBottom: "24px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Your Pickup Code</div>
                  <div style={{ fontSize: "32px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary-dark)", letterSpacing: "4px" }}>
                    {pickupCode}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            {!isPrinting && !isTorn && (
              <button
                onClick={startPrinting}
                className="btn-primary"
                style={{ padding: "12px 20px" }}
              >
                Print Receipt
              </button>
            )}

            {isStamped && !isTearing && !isTorn && (
              <button
                onClick={tearReceipt}
                className="btn-primary"
                style={{ padding: "12px 20px" }}
              >
                Tear Receipt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
