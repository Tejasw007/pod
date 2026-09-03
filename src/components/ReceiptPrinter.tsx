"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./ReceiptPrinter.module.css";
import html2canvas from "html2canvas";

interface ReceiptPrinterProps {
  orderId: string;
  fileName: string;
  pages: number;
  copies: number;
  ratePerPage: number;
  grandTotal: number;
  pickupCode?: string;
  onTorn?: () => void;
}

export default function ReceiptPrinter({
  orderId,
  fileName,
  pages,
  copies,
  ratePerPage,
  grandTotal,
  pickupCode,
  onTorn,
}: ReceiptPrinterProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const [isTearing, setIsTearing] = useState(false);
  const [isTorn, setIsTorn] = useState(false);
  const [barcodeSpans, setBarcodeSpans] = useState<number[]>([]);

  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate barcode random widths
    const spans = Array.from({ length: 40 }).map(() => {
      return Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1;
    });
    setBarcodeSpans(spans);
  }, []);

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
                height: isPrinting ? "320px" : "0",
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
                  <div
                    className={styles.rLine}
                    style={{ "--i": 0 } as React.CSSProperties}
                  >
                    <span>{fileName}</span>
                  </div>
                  <div
                    className={styles.rLine}
                    style={{ "--i": 1 } as React.CSSProperties}
                  >
                    <span>
                      {pages} pages x {copies} copies
                    </span>
                    <span>₹{pages * copies * ratePerPage}</span>
                  </div>
                </div>

                <div className={styles.rTotalBlock}>
                  <div
                    className={styles.rLine}
                    style={{ "--i": 2 } as React.CSSProperties}
                  >
                    <span>Subtotal</span>
                    <span>₹{pages * copies * ratePerPage}</span>
                  </div>
                </div>

                <div className={styles.rGrand}>
                  <span>TOTAL PAID</span>
                  <span>₹{grandTotal}</span>
                </div>

                <div className={styles.rThanks}>Ready for Print!</div>

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
                Your print order is ready.
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
                Head to any PrintPod to collect your print.
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
