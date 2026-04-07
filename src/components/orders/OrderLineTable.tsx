'use client';

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

interface Props {
  lines: OrderLine[];
  onUpdateQty: (id: string, qty: number) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onRemove: (id: string) => void;
}

function fmtTHB(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderLineTable({ lines, onUpdateQty, onUpdatePrice, onRemove }: Props) {
  if (lines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        No products added yet. Use the search above to add products.
      </div>
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.line_total_thb, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-700 text-white text-left">
            <th className="px-3 py-2 font-medium w-8">#</th>
            <th className="px-3 py-2 font-medium w-20">Code</th>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium text-center w-24">Qty</th>
            <th className="px-3 py-2 font-medium w-12">Unit</th>
            <th className="px-3 py-2 font-medium text-center w-28">Price (THB)</th>
            <th className="px-3 py-2 font-medium text-right w-28">Total (THB)</th>
            <th className="px-3 py-2 font-medium text-right w-20">Stock</th>
            <th className="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={line.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs text-blue-600">{line.pf_code}</td>
              <td className="px-3 py-2">{line.product_description}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={line.qty || ''}
                  onChange={(e) => onUpdateQty(line.id, parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                  min="0"
                  step="0.01"
                />
              </td>
              <td className="px-3 py-2 text-gray-500 text-xs">{line.selling_unit}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={line.unit_price_thb || ''}
                  onChange={(e) => onUpdatePrice(line.id, parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                  min="0"
                  step="1"
                />
              </td>
              <td className="px-3 py-2 text-right font-medium">{fmtTHB(line.line_total_thb)}</td>
              <td className={`px-3 py-2 text-right text-xs ${line.available_stock > 0 && line.qty > line.available_stock ? 'text-red-600 font-bold' : line.available_stock > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {line.available_stock > 0 ? fmtTHB(line.available_stock) : '-'}
                {line.available_stock > 0 && line.qty > line.available_stock && <div className="text-red-500 text-[10px]">LOW</div>}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => onRemove(line.id)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Remove"
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td colSpan={7} className="px-3 py-2 text-right">Subtotal:</td>
            <td className="px-3 py-2 text-right">{fmtTHB(subtotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
