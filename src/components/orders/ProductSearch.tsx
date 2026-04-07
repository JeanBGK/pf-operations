'use client';

import { useState, useRef, useEffect } from 'react';

interface Product {
  pf_code: string;
  description: string;
  category: string;
  selling_unit: string;
  price: number;
  stock: number;
}

interface Props {
  onSelect: (product: Product) => void;
  customerClassification: string;
  warehouse: string;
}

const PRICE_COL: Record<string, string> = {
  HOTEL: 'hotel_price',
  RETAIL: 'retail_price',
  RESTAURANT: 'restaurant_price',
  Hotel_PKT: 'hotel_pkt_price',
  Restaurant_PKT: 'restaurant_pkt_price',
  PRIVATE: 'private_price',
  'E-Commerce': 'ecommerce_price',
};

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ProductSearch({ onSelect, customerClassification }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const priceCol = PRICE_COL[customerClassification] || 'restaurant_price';

      // One query to product_catalog — has everything
      const resp = await fetch(
        `${url}/rest/v1/product_catalog?or=(description.ilike.%25${encodeURIComponent(query)}%25,pf_code.ilike.%25${encodeURIComponent(query)}%25)&order=${priceCol}.desc&limit=20`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const data = await resp.json();

      if (Array.isArray(data)) {
        setResults(data.map((r: Record<string, unknown>) => ({
          pf_code: r.pf_code as string,
          description: r.description as string,
          category: (r.category as string) || '',
          selling_unit: (r.selling_unit as string) || '',
          price: parseFloat(String(r[priceCol] ?? 0)) || 0,
          stock: parseFloat(String(r.stock_total ?? 0)) || 0,
        })));
      } else {
        setResults([]);
      }
      setIsOpen(true);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, customerClassification]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by product name or PF code..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {loading && <div className="absolute right-3 top-2.5 text-gray-400 text-sm">...</div>}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b text-[10px] text-gray-400 uppercase tracking-wide font-medium sticky top-0">
            <div className="flex-1">Product</div>
            <div className="w-24 text-right">Price (THB)</div>
            <div className="w-24 text-right">Stock</div>
          </div>
          {results.map((p) => (
            <button
              key={p.pf_code}
              onClick={() => { onSelect(p); setQuery(''); setIsOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-blue-600 shrink-0">{p.pf_code}</span>
                  <span className="text-sm truncate">{p.description}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{p.category} | {p.selling_unit}</div>
              </div>
              <div className="w-24 text-right shrink-0">
                {p.price > 0
                  ? <span className="text-sm font-semibold">{fmtNum(p.price)}</span>
                  : <span className="text-xs text-gray-300">--</span>}
              </div>
              <div className="w-24 text-right shrink-0">
                {p.stock > 0
                  ? <span className={`text-sm font-medium ${p.stock > 10 ? 'text-green-600' : 'text-amber-600'}`}>{fmtNum(p.stock)}</span>
                  : <span className="text-xs text-red-400 font-medium">OUT</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
          No products found
        </div>
      )}
    </div>
  );
}
