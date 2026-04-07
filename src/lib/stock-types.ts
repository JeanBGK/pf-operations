export interface StockRow {
  pf_code: string;
  description: string | null;
  supplier: string | null;
  stock_on_hand: number | null;
  minimum_stock: number | null;
  stock_date: string | null;
  is_low_stock: boolean;
  is_no_stock: boolean;
  air_qty: number | null;
  air_nearest_ship_date: string | null;
  air_po_numbers: string | null;
  air_order_count: number | null;
  sea_qty: number | null;
  sea_nearest_ship_date: string | null;
  sea_po_numbers: string | null;
  sea_order_count: number | null;
}
