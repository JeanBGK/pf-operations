import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-2">FDX Shipment Ops</h1>
      <p className="text-gray-500 mb-10">Premium Food Thailand — Operations Platform</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/orders/new"
          className="block bg-white rounded-lg shadow border-l-4 border-blue-500 p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold mb-1">New Sales Order</h2>
          <p className="text-sm text-gray-500">Create a customer order with live product search, pricing, and stock check</p>
        </Link>

        <Link href="/reconciliation/2026-04-02"
          className="block bg-white rounded-lg shadow border-l-4 border-green-500 p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold mb-1">Shipment Tracking</h2>
          <p className="text-sm text-gray-500">PO vs invoice reconciliation for the Apr 2 shipment</p>
        </Link>
      </div>
    </div>
  );
}
