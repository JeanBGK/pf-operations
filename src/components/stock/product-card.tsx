"use client";

import type { StockRow } from "@/lib/stock-types";

export function ProductCard({ row }: { row: StockRow }) {
  return (
    <div className={`rounded-lg border p-4 ${cardBg(row)}`}>
      {/* Header: PF code + stock badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="font-mono font-bold text-base">{row.pf_code}</span>
          <span className="ml-2 text-gray-400 text-sm">{row.supplier ?? ""}</span>
        </div>
        <StockBadge row={row} />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-3 leading-snug">
        {row.description ?? "\u2014"}
      </p>

      {/* Stock row */}
      <div className="flex gap-4 text-sm mb-2">
        <div>
          <span className="text-gray-400">Stock: </span>
          <span className={`font-medium ${stockColor(row)}`}>{formatQty(row.stock_on_hand)}</span>
        </div>
      </div>

      {/* Orders */}
      <div className="flex flex-col gap-1.5">
        {row.air_qty != null && (
          <div className="flex items-center gap-2 bg-orange-50 rounded px-2.5 py-1.5 text-sm">
            <span className="font-medium text-orange-700">AIR</span>
            <span className="text-orange-800">{formatQty(row.air_qty)} units</span>
            <span className="text-orange-600 ml-auto">{formatDate(row.air_nearest_ship_date!)}</span>
          </div>
        )}
        {row.sea_qty != null && (
          <div className="flex items-center gap-2 bg-blue-50 rounded px-2.5 py-1.5 text-sm">
            <span className="font-medium text-blue-700">SEA</span>
            <span className="text-blue-800">{formatQty(row.sea_qty)} units</span>
            <span className="text-blue-600 ml-auto">{formatDate(row.sea_nearest_ship_date!)}</span>
          </div>
        )}
        {row.air_qty == null && row.sea_qty == null && (
          <div className="text-sm text-gray-400 italic">No open orders</div>
        )}
      </div>
    </div>
  );
}

function StockBadge({ row }: { row: StockRow }) {
  if (row.stock_on_hand == null || row.stock_on_hand <= 0) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">No stock</span>;
  }
  if (row.minimum_stock != null && row.stock_on_hand <= row.minimum_stock) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>;
}

function cardBg(row: StockRow): string {
  if (row.stock_on_hand != null && row.stock_on_hand <= 0) return "bg-red-50/60 border-red-200";
  if (row.stock_on_hand != null && row.minimum_stock != null && row.stock_on_hand <= row.minimum_stock)
    return "bg-amber-50/60 border-amber-200";
  return "bg-white border-gray-200";
}

function stockColor(row: StockRow): string {
  if (row.stock_on_hand == null) return "text-gray-400";
  if (row.stock_on_hand <= 0) return "text-red-600";
  if (row.minimum_stock != null && row.stock_on_hand <= row.minimum_stock) return "text-amber-600";
  return "text-green-700";
}

function formatQty(n: number | null): string {
  if (n == null) return "\u2014";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
