import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import type { ReconciliationData, SupplierRecon } from '@/lib/reconciliation-types';
import SupplierCard from '@/components/reconciliation/SupplierCard';

/** Sort priority: VARIANCE/REVIEW first, then MISSING_INVOICE/NO_INVOICE, then MATCHED, then NO_PARSER */
function statusPriority(status: string): number {
  switch (status) {
    case 'VARIANCE': return 0;
    case 'REVIEW': return 1;
    case 'MISSING_INVOICE': return 2;
    case 'NO_INVOICE': return 3;
    case 'MATCHED': return 4;
    case 'NO_PARSER': return 5;
    default: return 6;
  }
}

function sortSuppliers(suppliers: SupplierRecon[]): SupplierRecon[] {
  return [...suppliers].sort((a, b) => {
    const pa = statusPriority(a.status);
    const pb = statusPriority(b.status);
    if (pa !== pb) return pa - pb;
    // Within same priority, sort by absolute variance descending
    return Math.abs(b.variance) - Math.abs(a.variance);
  });
}

function fmtEur(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export default async function ReconciliationPage({ params }: { params: Promise<{ shipmentDate: string }> }) {
  const { shipmentDate } = await params;

  const filePath = path.join(process.cwd(), 'src/data/reconciliation', `${shipmentDate}.json`);

  if (!fs.existsSync(filePath)) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Not Found</h1>
        <p className="text-gray-500">No reconciliation data for shipment date {shipmentDate}.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">Back to home</Link>
      </div>
    );
  }

  const data: ReconciliationData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const { summary } = data;
  const sorted = sortSuppliers(data.suppliers);

  const overallVariancePct = summary.total_po_eur !== 0
    ? ((summary.total_invoice_eur - summary.total_po_eur) / summary.total_po_eur * 100)
    : 0;
  const varianceColorClass =
    summary.total_variance === 0
      ? 'text-green-600'
      : Math.abs(overallVariancePct) >= 5
        ? 'text-red-600'
        : 'text-amber-600';

  return (
    <div>
      {/* Header bar */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:underline">&larr; Home</Link>
            <h1 className="text-2xl font-bold">Shipment Tracking</h1>
            <p className="text-sm text-gray-500">
              Shipment: {data.shipment_date} &middot; {data.shipping_method}
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            Generated: {new Date(data.generated_at).toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">PO Total</div>
            <div className="text-lg font-semibold">{fmtEur(summary.total_po_eur)}</div>
            <div className="text-xs text-gray-400">{summary.total_po_lines} lines</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Invoice Total</div>
            <div className="text-lg font-semibold">{fmtEur(summary.total_invoice_eur)}</div>
            <div className="text-xs text-gray-400">{summary.total_inv_lines} lines</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Variance</div>
            <div className={`text-lg font-semibold ${varianceColorClass}`}>{fmtEur(summary.total_variance)}</div>
            <div className="text-xs text-gray-400">{overallVariancePct.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Match Rate</div>
            <div className="text-lg font-semibold">
              {summary.total_matched_lines}/{summary.total_po_lines + summary.total_inv_lines - summary.total_matched_lines}
            </div>
            <div className="text-xs text-gray-400">
              {summary.matched_count} matched / {summary.variance_count} variance / {summary.missing_invoice_count} no inv
            </div>
          </div>
        </div>
      </div>

      {/* Supplier count row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{summary.suppliers_count} Suppliers</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">{summary.matched_count} matched</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">{summary.variance_count} variance</span>
          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">{summary.missing_invoice_count} no invoice</span>
        </div>
      </div>

      {/* Supplier cards */}
      <div className="space-y-4">
        {sorted.map((supplier) => (
          <SupplierCard key={supplier.supplier} supplier={supplier} />
        ))}
      </div>
    </div>
  );
}
