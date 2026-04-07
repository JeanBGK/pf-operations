'use client';

import Link from 'next/link';
import OrderForm from '@/components/orders/OrderForm';

export default function NewOrderPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
          <h1 className="text-2xl font-bold">New Sales Order</h1>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">DEMO</span>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <OrderForm />
      </div>
    </div>
  );
}
