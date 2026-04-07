'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseCore } from '@/lib/supabase';
import ProductSearch from './ProductSearch';
import OrderLineTable from './OrderLineTable';

// Map customer classification to price column in demo_product_prices view
const CLASSIFICATION_PRICE_MAP: Record<string, string> = {
  HOTEL: 'hotel_price',
  RETAIL: 'retail_price',
  RESTAURANT: 'restaurant_price',
  Hotel_PKT: 'hotel_pkt_price',
  Restaurant_PKT: 'restaurant_pkt_price',
  PRIVATE: 'private_price',
};

interface Customer {
  id: string;
  customer_code: string;
  reference_name: string;
  classification: string;
  payment_terms: string;
}

interface OrderLine {
  id: string;
  pf_code: string;
  product_description: string;
  qty: number;
  selling_unit: string;
  unit_price_thb: number;
  line_total_thb: number;
  available_stock: number;
}

const WAREHOUSES = ['BKK', 'PKT', 'BCS', 'BKK2', 'PEPE'];

const CLASSIFICATION_STYLES: Record<string, string> = {
  RETAIL: 'bg-blue-100 text-blue-800',
  RESTAURANT: 'bg-green-100 text-green-800',
  HOTEL: 'bg-purple-100 text-purple-800',
  Hotel_PKT: 'bg-purple-100 text-purple-800',
  Restaurant_PKT: 'bg-green-100 text-green-800',
  PRIVATE: 'bg-gray-100 text-gray-700',
};

function fmtTHB(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderForm() {
  // Customer search
  const [customerQuery, setCustQuery] = useState('');
  const [customerResults, setCustResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [custDropdownOpen, setCustDropdownOpen] = useState(false);

  // Order fields
  const [warehouse, setWarehouse] = useState('BKK');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  // State
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<string | null>(null);

  // Customer search
  useEffect(() => {
    if (customerQuery.length < 2) {
      setCustResults([]);
      setCustDropdownOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabaseCore
        .from('customers')
        .select('id, customer_code, reference_name, classification, payment_terms')
        .eq('customer_status', 'Completed')
        .or(`reference_name.ilike.%${customerQuery}%,customer_code.ilike.%${customerQuery}%`)
        .limit(15);
      setCustResults(data || []);
      setCustDropdownOpen(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  // Add product — price and stock already fetched by ProductSearch
  const handleAddProduct = useCallback((product: { pf_code: string; description: string; selling_unit: string; price: number; stock: number }) => {
    const price = product.price || 0;
    const newLine: OrderLine = {
      id: crypto.randomUUID(),
      pf_code: product.pf_code,
      product_description: product.description,
      qty: 1,
      selling_unit: product.selling_unit || 'Kg',
      unit_price_thb: price,
      line_total_thb: price,
      available_stock: product.stock || 0,
    };
    setLines(prev => [...prev, newLine]);
  }, []);

  // Update qty
  const handleUpdateQty = useCallback((id: string, qty: number) => {
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, qty, line_total_thb: qty * l.unit_price_thb } : l
    ));
  }, []);

  // Update price
  const handleUpdatePrice = useCallback((id: string, price: number) => {
    setLines(prev => prev.map(l =>
      l.id === id ? { ...l, unit_price_thb: price, line_total_thb: l.qty * price } : l
    ));
  }, []);

  // Remove line
  const handleRemove = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  }, []);

  // Totals
  const subtotal = lines.reduce((s, l) => s + l.line_total_thb, 0);
  const vat = Math.round(subtotal * 0.07 * 100) / 100;
  const total = subtotal + vat;

  // Save order
  const handleSave = async () => {
    if (!selectedCustomer) return;
    if (lines.length === 0) return;

    setSaving(true);
    try {
      const now = new Date();
      const orderNumber = `SO-${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;

      const { data: order, error: orderErr } = await supabase
        .from('demo_sales_orders')
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.reference_name,
          warehouse_code: warehouse,
          order_date: now.toISOString().slice(0, 10),
          delivery_date: deliveryDate || null,
          notes: notes || null,
          subtotal_thb: subtotal,
          vat_thb: vat,
          total_thb: total,
        })
        .select('id')
        .single();

      if (orderErr) throw orderErr;

      const orderLines = lines.map((l, i) => ({
        order_id: order.id,
        line_number: i + 1,
        pf_code: l.pf_code,
        product_description: l.product_description,
        qty: l.qty,
        selling_unit: l.selling_unit,
        unit_price_thb: l.unit_price_thb,
        line_total_thb: l.line_total_thb,
      }));

      const { error: linesErr } = await supabase
        .from('demo_sales_order_lines')
        .insert(orderLines);

      if (linesErr) throw linesErr;

      setSavedOrder(orderNumber);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save order. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  // Success view
  if (savedOrder) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-6xl mb-4">&#10003;</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">Order Saved</h2>
        <p className="text-lg text-gray-600 mb-1">{savedOrder}</p>
        <p className="text-sm text-gray-400 mb-6">
          {selectedCustomer?.reference_name} | {lines.length} items | {fmtTHB(total)} THB
        </p>
        <button
          onClick={() => {
            setSavedOrder(null);
            setSelectedCustomer(null);
            setCustQuery('');
            setLines([]);
            setNotes('');
            setDeliveryDate('');
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Create Another Order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer + Warehouse row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer search */}
        <div className="md:col-span-2 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              <span className="font-mono text-xs text-gray-500">{selectedCustomer.customer_code}</span>
              <span className="font-medium">{selectedCustomer.reference_name}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${CLASSIFICATION_STYLES[selectedCustomer.classification] || 'bg-gray-100'}`}>
                {selectedCustomer.classification}
              </span>
              <button
                onClick={() => { setSelectedCustomer(null); setCustQuery(''); }}
                className="ml-auto text-gray-400 hover:text-red-500"
              >
                &times;
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => setCustQuery(e.target.value)}
                placeholder="Search by customer name or code..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {custDropdownOpen && customerResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustDropdownOpen(false);
                        setCustQuery('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-mono text-xs text-gray-500 mr-2">{c.customer_code}</span>
                      <span className="text-sm">{c.reference_name}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${CLASSIFICATION_STYLES[c.classification] || 'bg-gray-100'}`}>
                        {c.classification}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Warehouse */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {WAREHOUSES.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Delivery date + notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Order notes (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Product search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Add Product</label>
        <ProductSearch
          onSelect={handleAddProduct}
          customerClassification={selectedCustomer?.classification || 'RESTAURANT'}
          warehouse={warehouse}
        />
      </div>

      {/* Order lines */}
      <OrderLineTable
        lines={lines}
        onUpdateQty={handleUpdateQty}
        onUpdatePrice={handleUpdatePrice}
        onRemove={handleRemove}
      />

      {/* Totals + Save */}
      {lines.length > 0 && (
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div></div>
          <div className="bg-gray-50 rounded-lg p-4 min-w-[250px]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Subtotal:</span>
              <span>{fmtTHB(subtotal)} THB</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">VAT (7%):</span>
              <span>{fmtTHB(vat)} THB</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Total:</span>
              <span>{fmtTHB(total)} THB</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!selectedCustomer || lines.length === 0 || saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>
    </div>
  );
}
