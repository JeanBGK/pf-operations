import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PF Operations",
  description: "Premium Food Thailand — Operations Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <nav className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">PF Operations</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/orders/new" className="text-slate-300 hover:text-white transition-colors">Orders</Link>
            <Link href="/stock" className="text-slate-300 hover:text-white transition-colors">Stock</Link>
            <Link href="/reconciliation/2026-04-02" className="text-slate-300 hover:text-white transition-colors">Shipments</Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
