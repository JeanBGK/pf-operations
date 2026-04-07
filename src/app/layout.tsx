import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FDX Shipment Operations",
  description: "Weekly shipment briefing and recap builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <nav className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
          <a href="/" className="font-semibold text-lg">FDX Shipment Ops</a>
          <div className="text-sm text-slate-300">March 2026</div>
        </nav>
        <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
