import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintPod — Print. Pay. Pickup.",
  description:
    "Self-service campus printing. Upload documents, pay online, and collect prints from any PrintPod.",
  icons: {
    icon: "/favicon.png",
  },
};

import BottomNav from "@/components/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
