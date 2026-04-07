import { getEventsForWeek, getShipmentWeeks } from '@/lib/data';
import Link from 'next/link';

const TYPE_COLORS: Record<string, string> = {
  delivery_exception: 'bg-red-100 text-red-800',
  exception_reported: 'bg-red-100 text-red-800',
  missing_item_alert: 'bg-orange-100 text-orange-800',
  shipment_confirmed: 'bg-green-100 text-green-800',
  claim_filing: 'bg-red-100 text-red-800',
  claim_response: 'bg-yellow-100 text-yellow-800',
  claim_resolved: 'bg-green-100 text-green-800',
  invoice_received: 'bg-purple-100 text-purple-800',
  credit_note_received: 'bg-teal-100 text-teal-800',
  recap_sent: 'bg-blue-100 text-blue-800',
  recap_revised: 'bg-yellow-100 text-yellow-800',
  price_list_received: 'bg-indigo-100 text-indigo-800',
  certificate_received: 'bg-green-100 text-green-800',
  certificate_requested: 'bg-yellow-100 text-yellow-800',
  operational_note: 'bg-gray-100 text-gray-800',
};

export default async function WeekDetailPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const events = getEventsForWeek(week);
  const weeks = getShipmentWeeks();
  const shipmentWeek = weeks.find(w => w.weekKey === week);

  const exceptions = events.filter(e => e.type === 'delivery_exception' || e.type === 'exception_reported');
  const missing = events.filter(e => e.type === 'missing_item_alert');
  const confirmed = events.filter(e => e.type === 'shipment_confirmed');
  const claims = events.filter(e => e.type.startsWith('claim_'));
  const financial = events.filter(e => e.type === 'invoice_received' || e.type === 'credit_note_received');
  const other = events.filter(e =>
    !['delivery_exception','exception_reported','missing_item_alert','shipment_confirmed',
      'claim_filing','claim_response','claim_resolved','invoice_received','credit_note_received']
      .includes(e.type)
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600">&larr; Back</Link>
        <h1 className="text-2xl font-bold">Week {week}</h1>
        {shipmentWeek?.france && (
          <Link href={`/recap/${week}/france`} className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium hover:bg-blue-100">
            France Recap
          </Link>
        )}
        {shipmentWeek?.italy && (
          <Link href={`/recap/${week}/italy`} className="px-3 py-1 bg-green-50 text-green-700 rounded text-sm font-medium hover:bg-green-100">
            Italy Recap
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exceptions + Missing */}
        {(exceptions.length > 0 || missing.length > 0) && (
          <div className="bg-white rounded-lg shadow">
            <h2 className="text-sm font-semibold px-4 py-3 bg-red-50 border-b text-red-800">
              Exceptions & Missing ({exceptions.length + missing.length})
            </h2>
            <div className="divide-y max-h-96 overflow-y-auto">
              {[...exceptions, ...missing].sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                <div key={i} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{e.date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[e.type] || 'bg-gray-100'}`}>
                      {e.type.replace(/_/g, ' ')}
                    </span>
                    {e.supplier && <span className="font-medium text-xs">{e.supplier.substring(0, 25)}</span>}
                  </div>
                  <p className="text-gray-700">{e.summary.substring(0, 150)}</p>
                  {e.products.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">Products: {e.products.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed */}
        {confirmed.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <h2 className="text-sm font-semibold px-4 py-3 bg-green-50 border-b text-green-800">
              Confirmed Dispatches ({confirmed.length})
            </h2>
            <div className="divide-y max-h-96 overflow-y-auto">
              {confirmed.sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                <div key={i} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{e.date}</span>
                    {e.supplier && <span className="font-medium">{e.supplier.substring(0, 30)}</span>}
                  </div>
                  <p className="text-gray-600 text-xs">{e.summary.substring(0, 120)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claims */}
        {claims.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <h2 className="text-sm font-semibold px-4 py-3 bg-purple-50 border-b text-purple-800">
              Claims ({claims.length})
            </h2>
            <div className="divide-y max-h-96 overflow-y-auto">
              {claims.sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                <div key={i} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{e.date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[e.type] || 'bg-gray-100'}`}>
                      {e.type.replace('claim_', '')}
                    </span>
                    {e.claimCode && <span className="font-mono text-xs font-medium">{e.claimCode}</span>}
                  </div>
                  <p className="text-gray-700">{e.summary.substring(0, 150)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial */}
        {financial.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <h2 className="text-sm font-semibold px-4 py-3 bg-indigo-50 border-b text-indigo-800">
              Financial ({financial.length})
            </h2>
            <div className="divide-y max-h-96 overflow-y-auto">
              {financial.sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
                <div key={i} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{e.date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[e.type] || 'bg-gray-100'}`}>
                      {e.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs">{e.summary.substring(0, 120)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
