"use client";

import Link from "next/link";
import { useStockData } from "@/lib/use-stock-data";
import { SearchBar, FilterButtons, StockDateNote, Spinner } from "@/components/stock/filters";
import { DesktopTable } from "@/components/stock/desktop-table";
import { ProductCard } from "@/components/stock/product-card";

export default function StockPage() {
  const data = useStockData();

  if (data.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold text-lg">Database Error</h2>
        <p className="text-red-700 mt-2">{data.error}</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">&larr; Home</Link>
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-4">
        <SearchBar
          search={data.search}
          setSearch={data.setSearch}
          loading={data.loading}
          debouncedSearch={data.debouncedSearch}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <FilterButtons
            filter={data.filter}
            setOrderFilter={data.setOrderFilter}
            setStockFilter={data.setStockFilter}
            shipDate={data.shipDate}
            setShipDate={data.setShipDate}
            relevantDates={data.relevantDates}
          />
          <StockDateNote stockDate={data.rows[0]?.stock_date ?? null} />
        </div>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <DesktopTable
          rows={data.rows}
          total={data.total}
          sortKey={data.sortKey}
          sortDir={data.sortDir}
          onSort={data.handleSort}
          loading={data.loading}
        />
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden">
        <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
          {data.total.toLocaleString()} products
          {data.loading && <Spinner />}
        </div>
        <div className={`flex flex-col gap-2 ${data.loading ? "opacity-70" : ""}`}>
          {data.rows.slice(0, 100).map((row) => (
            <ProductCard key={row.pf_code} row={row} />
          ))}
          {data.rows.length > 100 && (
            <div className="text-center text-sm text-gray-400 py-4">
              Showing first 100 of {data.total.toLocaleString()}. Use search to narrow results.
            </div>
          )}
          {data.rows.length === 0 && !data.loading && (
            <div className="text-center text-gray-400 py-8">No products match your search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
