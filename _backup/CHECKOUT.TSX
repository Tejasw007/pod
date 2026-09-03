'use client';

import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import ReceiptPrinter from '@/components/ReceiptPrinter';

export default function CheckoutPage() {
    const { items, finalTotal, subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0), platformFee, handlingFee, clearCart } = useCart();
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [orderData, setOrderData] = useState<any>(null);
    const router = useRouter();

    if (items.length === 0 && !paymentSuccess) {
        router.push('/');
        return null;
    }

    const handlePayment = async () => {
        setIsProcessing(true);

        // In a real app, we would get the selected address from context/props
        // For this demo, we'll use dummy delivery coordinates representing the user's house
        const deliveryLat = 12.9716;
        const deliveryLng = 77.5946;

        try {
            // 1. Fetch a mock restaurant ID (just to satisfy DB constraints for demo)
            let restaurantId = "mock-rest-123";
            try {
                const rRes = await fetch('/api/restaurants'); // we don't have this yet, let's just mock it
            } catch (e) { }

            // 2. Create the real order in the database
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: "mock-customer", // Should come from AuthContext in a real flow
                    restaurantId: "mock-restaurant", // Mock
                    items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
                    deliveryLat,
                    deliveryLng,
                    totalAmount: finalTotal,
                    razorpayOrderId: null,
                    razorpayPaymentId: null
                })
            });
            const data = await res.json();
            const realOrderId = data.order?.id || "FD-" + Math.floor(100000 + Math.random() * 900000);

            // Save order data before clearing the cart
            setOrderData({
                orderId: realOrderId,
                items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                subtotal,
                platformFee,
                handlingFee,
                grandTotal: finalTotal,
                restaurantName: "Burger King" // Mocked
            });

            setPaymentSuccess(true);
            clearCart();
        } catch (err) {
            console.error("Failed to create order", err);
            alert("Failed to process order.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (paymentSuccess && orderData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <ReceiptPrinter {...orderData} />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-black mb-8 text-center">Complete Payment</h1>

            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                <h2 className="text-xl font-bold mb-6">Amount to Pay: <span className="text-[hsl(var(--primary))]">₹{finalTotal}</span></h2>

                <div className="space-y-4 mb-8">
                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'RAZORPAY' ? 'border-[hsl(var(--primary))] bg-purple-50' : 'border-gray-200'}`}>
                        <input
                            type="radio"
                            name="payment"
                            value="RAZORPAY"
                            checked={paymentMethod === 'RAZORPAY'}
                            onChange={() => setPaymentMethod('RAZORPAY')}
                            className="w-5 h-5 text-[hsl(var(--primary))]"
                        />
                        <div>
                            <p className="font-bold">Pay via Razorpay</p>
                            <p className="text-sm text-gray-500">Credit/Debit Card, UPI, Wallets</p>
                        </div>
                    </label>

                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-[hsl(var(--primary))] bg-purple-50' : 'border-gray-200'}`}>
                        <input
                            type="radio"
                            name="payment"
                            value="COD"
                            checked={paymentMethod === 'COD'}
                            onChange={() => setPaymentMethod('COD')}
                            className="w-5 h-5 text-[hsl(var(--primary))]"
                        />
                        <div>
                            <p className="font-bold">Cash on Delivery</p>
                            <p className="text-sm text-gray-500">Pay at your doorstep</p>
                        </div>
                    </label>
                </div>

                <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full bg-[hsl(var(--primary))] text-white py-4 rounded-xl font-bold text-lg uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isProcessing ? 'Processing...' : `Pay ₹${finalTotal}`}
                </button>
            </div>
        </div>
    );
}
