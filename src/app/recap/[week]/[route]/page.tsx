import { buildRecapSuppliers, getShipmentWeeks } from '@/lib/data';
import RecapBuilder from '@/components/RecapBuilder';

export default async function RecapPage({ params }: { params: Promise<{ week: string; route: string }> }) {
  const { week, route } = await params;
  const validRoute = route as 'france' | 'italy';
  const weeks = getShipmentWeeks();
  const shipmentWeek = weeks.find(w => w.weekKey === week);
  const shipment = validRoute === 'france' ? shipmentWeek?.france : shipmentWeek?.italy;

  if (!shipment) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-semibold text-gray-500">No {route} shipment for {week}</h1>
        <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Back to dashboard</a>
      </div>
    );
  }

  const suppliers = buildRecapSuppliers(week, validRoute);
  const shipmentDate = shipment.date;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <a href="/" className="text-gray-400 hover:text-gray-600">&larr; Back</a>
        <h1 className="text-2xl font-bold">
          {route === 'france' ? 'France' : 'Italy'} Recap — {week}
        </h1>
        <span className="text-gray-500">Shipment: {shipmentDate}</span>
        {shipment.revised && (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
            REVISED
          </span>
        )}
      </div>
      <RecapBuilder
        initialSuppliers={suppliers}
        route={validRoute}
        shipmentDate={shipmentDate}
        forwarder={shipment.forwarder}
        packing={shipment.packing}
      />
    </div>
  );
}
