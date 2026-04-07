"use client";

import { useState, useEffect, useCallback } from "react";
import {
  queryStock,
  fetchShipDates,
  type FilterMode,
  type SortKey,
  type SortDir,
  type ShipDate,
} from "./stock-queries";
import type { StockRow } from "./stock-types";

const DEFAULT_SORT_KEY: SortKey = "air_nearest_ship_date";
const DEFAULT_SORT_DIR: SortDir = "asc";
const DEBOUNCE_MS = 250;

export type { FilterMode, SortKey, SortDir, ShipDate };
export { DEFAULT_SORT_KEY, DEFAULT_SORT_DIR };

export function isOrderFilter(f: FilterMode): boolean {
  return f === "with-orders" || f === "with-air" || f === "with-sea";
}

export function useStockData() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterMode>("with-orders");
  const [shipDate, setShipDate] = useState<string | null>(null);
  const [shipDates, setShipDates] = useState<ShipDate[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);

  useEffect(() => {
    fetchShipDates().then(setShipDates);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await queryStock({
      filter,
      search: debouncedSearch,
      sortKey,
      sortDir,
      shipDate: isOrderFilter(filter) ? shipDate : null,
    });
    setRows(result.rows);
    setTotal(result.total);
    setError(result.error);
    setLoading(false);
  }, [filter, debouncedSearch, sortKey, sortDir, shipDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(DEFAULT_SORT_KEY);
        setSortDir(DEFAULT_SORT_DIR);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function setOrderFilter(f: "with-orders" | "with-air" | "with-sea") {
    setFilter(f);
  }

  function setStockFilter(f: "low-stock" | "no-stock" | "all") {
    setFilter(f);
    setShipDate(null);
  }

  const relevantDates = shipDates.filter((d) => {
    if (filter === "with-air") return d.method === "Air";
    if (filter === "with-sea") return d.method === "Sea";
    return true;
  });

  return {
    rows,
    total,
    loading,
    error,
    filter,
    shipDate,
    setShipDate,
    relevantDates,
    search,
    setSearch,
    sortKey,
    sortDir,
    handleSort,
    setOrderFilter,
    setStockFilter,
    debouncedSearch,
  };
}
