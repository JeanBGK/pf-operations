import { buildNextShipmentDraft } from '@/lib/data';
import RecapBuilder from '@/components/RecapBuilder';

export default async function NextRecapPage({ params }: { params: Promise<{ route: string }> }) {
  const { route } = await params;
  const validRoute = route as 'france' | 'italy';
  const draft = buildNextShipmentDraft(validRoute);

  if (!draft) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-semibold text-gray-500">No previous {route} recap to base draft on</h1>
        <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Back to dashboard</a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <a href="/" className="text-gray-400 hover:text-gray-600">&larr; Back</a>
        <h1 className="text-2xl font-bold">
          Next {route === 'france' ? 'France' : 'Italy'} Shipment — {draft.date}
        </h1>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          DRAFT
        </span>
      </div>

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        Based on last recap ({draft.basedOn}). All suppliers start as <strong>Pending</strong> — update as confirmations come in.
        {draft.recentIssues.length > 0 && (
          <span> {draft.recentIssues.length} recent issues flagged in supplier notes.</span>
        )}
      </div>

      <RecapBuilder
        initialSuppliers={draft.suppliers}
        route={validRoute}
        shipmentDate={draft.date}
        forwarder={draft.forwarder}
        packing={draft.packing}
      />
    </div>
  );
}
