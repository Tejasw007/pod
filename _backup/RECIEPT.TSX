'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './ReceiptPrinter.module.css';
import html2canvas from 'html2canvas';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
}

interface ReceiptPrinterProps {
    orderId: string;
    items: ReceiptItem[];
    subtotal: number;
    platformFee: number;
    handlingFee: number;
    grandTotal: number;
    restaurantName?: string;
}

export default function ReceiptPrinter({
    orderId,
    items,
    subtotal,
    platformFee,
    handlingFee,
    grandTotal,
    restaurantName = "Burger King"
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
            return Math.random() > 0.7 ? 3 : (Math.random() > 0.4 ? 2 : 1);
        });
        setBarcodeSpans(spans);
    }, []);

    const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();

    const startPrinting = () => {
        if (isPrinting) return;

        // Reset states
        setIsPrinting(false);
        setIsStamped(false);
        setIsTearing(false);
        setIsTorn(false);

        // Small delay to allow reset to apply
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
                    backgroundColor: '#FBF9F5',
                    scale: 2, // Higher quality
                });
                const image = canvas.toDataURL("image/png");
                const link = document.createElement('a');
                link.download = `Receipt-${orderId}.png`;
                link.href = image;
                link.click();
            } catch (err) {
                console.error("Failed to save receipt image", err);
            }
        }

        setIsTearing(true);
        setTimeout(() => {
            setIsTorn(true);
        }, 800);
    };

    const resetPrinter = () => {
        setIsPrinting(false);
        setIsStamped(false);
        setIsTearing(false);
        setIsTorn(false);
        startPrinting();
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div className={styles.stage}>
                <div className={styles.printerWrap}>
                    <div className={styles.printer}></div>
                    <div className={styles.feedContainer}>
                        <div className={`${styles.feed} ${isPrinting ? styles.printing : ''} ${isStamped ? styles.stamped : ''}`} style={{ height: isPrinting ? (400 + (items.length * 24)) + 'px' : '0' }}>
                            <div ref={receiptRef} className={`${styles.receipt} ${isTearing ? styles.tearing : ''}`}>
                                <div className={styles.stamp}>
                                    PAID
                                    <small>{today}</small>
                                </div>

                                <div className={styles.rBrand}>
                                    <span className={styles.name}>FOODIES</span>
                                    <span className={styles.mark}>F</span>
                                </div>

                                <div className={styles.rSub}>Order #{orderId} &middot; {restaurantName}</div>

                                <div className="mb-4">
                                    {items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={styles.rLine}
                                            style={{ '--i': idx } as React.CSSProperties}
                                        >
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.rTotalBlock}>
                                    <div className={styles.rLine} style={{ '--i': items.length } as React.CSSProperties}>
                                        <span>Subtotal</span>
                                        <span>₹{subtotal}</span>
                                    </div>
                                    <div className={styles.rLine} style={{ '--i': items.length + 1 } as React.CSSProperties}>
                                        <span>Handling Fee</span>
                                        <span>₹{handlingFee}</span>
                                    </div>
                                    <div className={styles.rLine} style={{ '--i': items.length + 2 } as React.CSSProperties}>
                                        <span>Platform Fee</span>
                                        <span>₹{platformFee}</span>
                                    </div>
                                </div>

                                <div className={styles.rGrand}>
                                    <span>GRAND TOTAL</span>
                                    <span>₹{grandTotal}</span>
                                </div>

                                <div className={styles.rThanks}>Thank you for ordering!</div>

                                <div className={styles.barcode}>
                                    {barcodeSpans.map((w, i) => (
                                        <span key={i} style={{ width: w + 'px', transitionDelay: (1.8 + i * 0.01) + 's' }}></span>
                                    ))}
                                </div>
                                <div className={styles.orderId}>TXN-{orderId}-KP</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center w-full">
                    {!isPrinting && !isTorn && (
                        <>
                            <div className="text-2xl font-bold mb-2">Payment Successful</div>
                            <div className="text-sm text-gray-500 mb-6">Your order receipt is ready.</div>
                        </>
                    )}
                    {isPrinting && !isStamped && (
                        <>
                            <div className="text-2xl font-bold mb-2">Printing Receipt...</div>
                            <div className="text-sm text-gray-500 mb-6 opacity-0">...</div>
                        </>
                    )}
                    {isStamped && !isTearing && !isTorn && (
                        <>
                            <div className="text-2xl font-bold mb-2">Print Complete</div>
                            <div className="text-sm text-gray-500 mb-6">You can now tear the receipt.</div>
                        </>
                    )}
                    {isTorn && (
                        <>
                            <div className="text-2xl font-bold mb-2">Order Confirmed!</div>
                            <div className="text-sm text-gray-500 mb-6">Your food is being prepared.</div>
                        </>
                    )}

                    <div className="flex gap-3 justify-center">
                        {!isPrinting && !isTorn && (
                            <button onClick={startPrinting} className="bg-[hsl(var(--primary))] text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-2 hover:opacity-90">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
                                Print Receipt
                            </button>
                        )}

                        {isStamped && !isTearing && !isTorn && (
                            <button onClick={tearReceipt} className="bg-[hsl(var(--primary))] text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-2 hover:opacity-90">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 12l4-4 4 4 4-8 4 8" /></svg>
                                Tear Receipt
                            </button>
                        )}

                        {isTorn && (
                            <button onClick={() => window.location.href = `/track/${orderId}`} className="bg-[hsl(var(--primary))] text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-2 hover:opacity-90">
                                Track Order
                            </button>
                        )}

                        {(!isPrinting || isStamped) && (
                            <button onClick={() => navigator.clipboard.writeText(`FOODIES - Order #${orderId}\nGRAND TOTAL: ₹${grandTotal}\nPayment Successful`)} className="bg-white border border-gray-200 text-gray-700 font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-50">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                Copy
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
