'use client';

import { useState } from 'react';
import type { RecapSupplier, BoxAssignment } from '@/lib/types';
import { generateFranceRecap, generateItalyRecap } from '@/lib/recap-generator';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  missing: 'bg-red-100 text-red-800',
  exception: 'bg-orange-100 text-orange-800',
  removed: 'bg-gray-100 text-gray-500 line-through',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  missing: 'Missing',
  exception: 'Exception',
  removed: 'Removed',
};

interface Props {
  initialSuppliers: RecapSupplier[];
  route: 'france' | 'italy';
  shipmentDate: string;
  forwarder: string;
  packing: string;
}

export default function RecapBuilder({ initialSuppliers, route, shipmentDate, forwarder, packing }: Props) {
  const [suppliers, setSuppliers] = useState<RecapSupplier[]>(initialSuppliers);
  const [copied, setCopied] = useState(false);

  const updateSupplier = (index: number, updates: Partial<RecapSupplier>) => {
    setSuppliers(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const recapText = route === 'france'
    ? generateFranceRecap(shipmentDate, suppliers)
    : generateItalyRecap(shipmentDate, suppliers);

  const handleCopy = () => {
    navigator.clipboard.writeText(recapText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const includedCount = suppliers.filter(s => s.included).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Supplier Checklist */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold">
            Suppliers ({includedCount} included)
          </h2>
          <span className="text-sm text-gray-500">
            {forwarder} — {shipmentDate}
          </span>
        </div>

        <div className="divide-y max-h-[600px] overflow-y-auto">
          {suppliers.map((supplier, i) => (
            <div key={i} className={`px-4 py-3 ${!supplier.included ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={supplier.included}
                  onChange={(e) => updateSupplier(i, { included: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />

                {/* Supplier name */}
                <span className="font-medium flex-1">{supplier.name}</span>

                {/* Status badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[supplier.status]}`}>
                  {STATUS_LABELS[supplier.status]}
                </span>

                {/* Box assignment (France only) */}
                {route === 'france' && (
                  <select
                    value={supplier.box}
                    onChange={(e) => updateSupplier(i, { box: e.target.value as BoxAssignment })}
                    className="text-xs border rounded px-2 py-1 bg-white"
                  >
                    <option value="A">Box A</option>
                    <option value="B">Box B</option>
                    <option value="Frozen">Frozen</option>
                    <option value="none">—</option>
                  </select>
                )}
              </div>

              {/* Missing products */}
              {supplier.missingProducts.length > 0 && (
                <div className="mt-1 ml-7 text-xs text-red-600">
                  Missing: {supplier.missingProducts.join(', ')}
                </div>
              )}

              {/* Exception */}
              {supplier.exceptionSummary && (
                <div className="mt-1 ml-7 text-xs text-orange-600">
                  {supplier.exceptionSummary.substring(0, 120)}
                </div>
              )}

              {/* Confirmation */}
              {supplier.status === 'confirmed' && supplier.confirmationSummary && (
                <div className="mt-1 ml-7 text-xs text-green-600">
                  {supplier.confirmationSummary.substring(0, 120)}
                </div>
              )}

              {/* Notes input */}
              <div className="mt-1 ml-7">
                <input
                  type="text"
                  value={supplier.notes}
                  onChange={(e) => updateSupplier(i, { notes: e.target.value })}
                  placeholder="Add note..."
                  className="text-xs border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-0 w-full px-0 py-0.5 bg-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Email Preview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold">Email Preview</h2>
          <button
            onClick={handleCopy}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
          {recapText}
        </pre>
      </div>
    </div>
  );
}
