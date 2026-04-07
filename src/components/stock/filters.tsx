"use client";

import type { FilterMode, ShipDate } from "@/lib/use-stock-data";
import { isOrderFilter } from "@/lib/use-stock-data";

function formatDateLabel(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateShort(d: string): string {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function Spinner() {
  return (
    <div className="inline-block h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
  );
}

function formatStockDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function StockDateNote({ stockDate }: { stockDate: string | null }) {
  if (!stockDate) return null;
  return (
    <span className="text-xs text-gray-400 italic">
      Stock as of {formatStockDate(stockDate)}
    </span>
  );
}

export function SearchBar({
  search,
  setSearch,
  loading,
  debouncedSearch,
}: {
  search: string;
  setSearch: (s: string) => void;
  loading: boolean;
  debouncedSearch: string;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search PF code, description, or supplier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {loading && search !== debouncedSearch && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Spinner />
        </div>
      )}
    </div>
  );
}

export function FilterButtons({
  filter,
  setOrderFilter,
  setStockFilter,
  shipDate,
  setShipDate,
  relevantDates,
}: {
  filter: FilterMode;
  setOrderFilter: (f: "with-orders" | "with-air" | "with-sea") => void;
  setStockFilter: (f: "low-stock" | "no-stock" | "all") => void;
  shipDate: string | null;
  setShipDate: (d: string | null) => void;
  relevantDates: ShipDate[];
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      {/* Order filters */}
      <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1.5">
        <button
          onClick={() => setOrderFilter("with-orders")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors border ${
            filter === "with-orders"
              ? "bg-slate-700 text-white border-slate-700 shadow-sm"
              : "text-slate-500 border-transparent hover:bg-slate-200"
          }`}
        >
          All Orders
        </button>
        <div className="w-px h-5 bg-slate-300" />
        <button
          onClick={() => setOrderFilter("with-air")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            filter === "with-air"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Air
        </button>
        <button
          onClick={() => setOrderFilter("with-sea")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            filter === "with-sea"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Sea
        </button>

        {isOrderFilter(filter) && relevantDates.length > 0 && (
          <>
            <div className="w-px h-5 bg-slate-300" />
            <select
              value={shipDate ?? ""}
              onChange={(e) => setShipDate(e.target.value || null)}
              className="px-1.5 py-1.5 rounded-md text-xs sm:text-sm border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[130px] sm:max-w-none"
            >
              <option value="">Dates</option>
              {relevantDates.map((d) => (
                <option key={`${d.date}-${d.method}`} value={d.date}>
                  {formatDateShort(d.date)} {d.method} ({d.products})
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Stock filters */}
      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg p-1.5">
        <button
          onClick={() => setStockFilter("all")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors border ${
            filter === "all"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
              : "text-emerald-600 border-transparent hover:bg-emerald-100"
          }`}
        >
          All Products
        </button>
        <div className="w-px h-5 bg-emerald-300" />
        <button
          onClick={() => setStockFilter("low-stock")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            filter === "low-stock"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-emerald-600 hover:bg-emerald-100"
          }`}
        >
          Low Stock
        </button>
        <button
          onClick={() => setStockFilter("no-stock")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            filter === "no-stock"
              ? "bg-red-500 text-white shadow-sm"
              : "text-emerald-600 hover:bg-emerald-100"
          }`}
        >
          Out of Stock
        </button>
      </div>
    </div>
  );
}
