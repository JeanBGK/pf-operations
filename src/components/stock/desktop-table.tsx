"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { StockRow } from "@/lib/stock-types";
import type { SortKey, SortDir } from "@/lib/use-stock-data";
import { Spinner } from "./filters";

const ROW_HEIGHT = 36;
const TABLE_HEIGHT = 700;

const COL_STYLES: Record<SortKey, string> = {
  pf_code: "w-[8%]",
  description: "w-[47%]",
  supplier: "w-[13%]",
  stock_on_hand: "w-[6%]",
  minimum_stock: "hidden",
  air_qty: "w-[6%]",
  air_nearest_ship_date: "w-[7%]",
  sea_qty: "w-[6%]",
  sea_nearest_ship_date: "w-[7%]",
};

export const COLUMNS: {
  key: SortKey;
  label: string;
  align: "left" | "right";
  bg?: string;
}[] = [
  { key: "pf_code", label: "PF Code", align: "left" },
  { key: "description", label: "Description", align: "left" },
  { key: "supplier", label: "Supplier", align: "left" },
  { key: "stock_on_hand", label: "Stock", align: "right" },
  { key: "air_qty", label: "Air Qty", align: "right", bg: "bg-orange-50" },
  { key: "air_nearest_ship_date", label: "Air Ship", align: "left", bg: "bg-orange-50" },
  { key: "sea_qty", label: "Sea Qty", align: "right", bg: "bg-blue-50" },
  { key: "sea_nearest_ship_date", label: "Sea Ship", align: "left", bg: "bg-blue-50" },
];

export function DesktopTable({
  rows,
  total,
  sortKey,
  sortDir,
  onSort,
  loading,
}: {
  rows: StockRow[];
  total: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  loading: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return (
    <>
      <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
        {total.toLocaleString()} products
        {loading && <Spinner />}
      </div>

      <div
        className={`rounded-lg border border-gray-200 ${loading ? "opacity-70" : ""}`}
        style={{ transition: "opacity 100ms" }}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex w-full">
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                onClick={() => onSort(col.key)}
                className={`flex-none px-3 py-2 font-semibold text-sm cursor-pointer select-none hover:bg-gray-100 truncate ${COL_STYLES[col.key]} ${
                  col.align === "right" ? "text-right" : "text-left"
                } ${col.bg ?? ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <SortIndicator active={sortKey === col.key} dir={sortKey === col.key ? sortDir : "asc"} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Virtual body */}
        <div
          ref={parentRef}
          className="overflow-y-auto"
          style={{ height: Math.min(TABLE_HEIGHT, rows.length * ROW_HEIGHT + 2) }}
        >
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index];
              return (
                <div
                  key={row.pf_code}
                  className={`flex w-full border-b border-gray-100 hover:bg-gray-50 ${stockRowClass(row)}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: vRow.size,
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  <div className={`flex-none px-3 py-2 text-sm font-mono font-medium truncate ${COL_STYLES.pf_code}`}>
                    {row.pf_code}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm truncate ${COL_STYLES.description}`} title={row.description ?? ""}>
                    {row.description ?? "\u2014"}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm truncate ${COL_STYLES.supplier}`}>
                    {row.supplier ?? "\u2014"}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm text-right font-medium ${COL_STYLES.stock_on_hand} ${stockColor(row)}`}>
                    {formatQty(row.stock_on_hand)}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm text-right text-gray-400 ${COL_STYLES.minimum_stock}`}>
                    {formatQty(row.minimum_stock)}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm text-right font-medium bg-orange-50/50 ${COL_STYLES.air_qty}`}>
                    {row.air_qty != null ? (
                      <span className="text-orange-700" title={row.air_po_numbers ?? ""}>{formatQty(row.air_qty)}</span>
                    ) : <span className="text-gray-300">{"\u2014"}</span>}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm bg-orange-50/50 ${COL_STYLES.air_nearest_ship_date}`}>
                    {row.air_nearest_ship_date
                      ? <span className="text-orange-700">{formatDate(row.air_nearest_ship_date)}</span>
                      : <span className="text-gray-300">{"\u2014"}</span>}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm text-right font-medium bg-blue-50/50 ${COL_STYLES.sea_qty}`}>
                    {row.sea_qty != null ? (
                      <span className="text-blue-700" title={row.sea_po_numbers ?? ""}>{formatQty(row.sea_qty)}</span>
                    ) : <span className="text-gray-300">{"\u2014"}</span>}
                  </div>
                  <div className={`flex-none px-3 py-2 text-sm bg-blue-50/50 ${COL_STYLES.sea_nearest_ship_date}`}>
                    {row.sea_nearest_ship_date
                      ? <span className="text-blue-700">{formatDate(row.sea_nearest_ship_date)}</span>
                      : <span className="text-gray-300">{"\u2014"}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {rows.length === 0 && !loading && (
          <div className="px-3 py-8 text-center text-gray-400 text-sm">
            No products match your search.
          </div>
        )}
      </div>
    </>
  );
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 text-xs ml-0.5">{"\u2195"}</span>;
  return <span className="text-slate-700 text-xs ml-0.5">{dir === "asc" ? "\u25B2" : "\u25BC"}</span>;
}

function stockRowClass(row: StockRow): string {
  if (row.stock_on_hand != null && row.stock_on_hand <= 0) return "bg-red-50/50";
  if (row.stock_on_hand != null && row.minimum_stock != null && row.stock_on_hand <= row.minimum_stock)
    return "bg-amber-50/50";
  return "";
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
