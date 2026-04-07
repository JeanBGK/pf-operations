import { supabaseInventory, supabasePurchasing } from "./supabase";

export type FilterMode = "all" | "with-orders" | "with-air" | "with-sea" | "low-stock" | "no-stock";
export type SortKey =
  | "pf_code"
  | "description"
  | "supplier"
  | "stock_on_hand"
  | "minimum_stock"
  | "air_qty"
  | "air_nearest_ship_date"
  | "sea_qty"
  | "sea_nearest_ship_date";
export type SortDir = "asc" | "desc";

export interface QueryParams {
  filter: FilterMode;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
  shipDate: string | null;
}

export interface ShipDate {
  date: string;
  method: string;
  products: number;
}

export async function fetchShipDates(): Promise<ShipDate[]> {
  const { data } = await supabasePurchasing
    .from("purchase_lines")
    .select("target_ship_date, shipping_method")
    .gte("target_ship_date", new Date().toISOString().split("T")[0])
    .gt("qty", 0)
    .in("shipping_method", ["By Air", "By Sea"]);

  if (!data) return [];

  const map = new Map<string, ShipDate>();
  for (const row of data) {
    const key = `${row.target_ship_date}|${row.shipping_method}`;
    const existing = map.get(key);
    if (existing) {
      existing.products++;
    } else {
      map.set(key, {
        date: row.target_ship_date,
        method: row.shipping_method === "By Air" ? "Air" : "Sea",
        products: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function queryStock(params: QueryParams) {
  const { filter, search, sortKey, sortDir, shipDate } = params;

  let query = supabaseInventory
    .from("v_stock_replenishment")
    .select("*", { count: "exact" });

  if (filter === "with-orders") {
    query = query.or("air_qty.not.is.null,sea_qty.not.is.null");
  } else if (filter === "with-air") {
    query = query.not("air_qty", "is", null);
  } else if (filter === "with-sea") {
    query = query.not("sea_qty", "is", null);
  } else if (filter === "low-stock") {
    query = query.eq("is_low_stock", true);
  } else if (filter === "no-stock") {
    query = query.eq("is_no_stock", true);
  }

  if (shipDate && (filter === "with-orders" || filter === "with-air" || filter === "with-sea")) {
    query = query.or(
      `air_nearest_ship_date.eq.${shipDate},sea_nearest_ship_date.eq.${shipDate}`
    );
  }

  if (search.trim()) {
    const q = search.trim();
    query = query.or(
      `pf_code.ilike.%${q}%,description.ilike.%${q}%,supplier.ilike.%${q}%`
    );
  }

  query = query.order(sortKey, {
    ascending: sortDir === "asc",
    nullsFirst: false,
  });

  query = query.limit(10000);

  const { data, error, count } = await query;

  return {
    rows: data ?? [],
    total: count ?? 0,
    error: error?.message ?? null,
  };
}
