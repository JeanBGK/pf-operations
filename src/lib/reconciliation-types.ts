// TypeScript interfaces for reconciliation JSON data

export type SupplierStatus = 'MATCHED' | 'VARIANCE' | 'MISSING_INVOICE' | 'NO_INVOICE' | 'NO_PARSER' | 'REVIEW';

export type MatchLevel = 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'CANDIDATE';

export type VarianceType =
  | 'PRICE_CHANGE'
  | 'QTY_DIFFERENCE'
  | 'MISSING_PRODUCT'
  | 'EXTRA_PRODUCT'
  | 'SUBSTITUTION'
  | 'NO_INVOICE'
  | 'QTY_NOT_RECEIVED'
  | 'TOTAL_MISMATCH'
  | 'WEIGHT_VARIANCE';

export type VarianceSeverity = 'high' | 'medium' | 'low';

export interface ReconciliationSummary {
  total_po_eur: number;
  total_invoice_eur: number;
  total_variance: number;
  suppliers_count: number;
  matched_count: number;
  variance_count: number;
  missing_invoice_count: number;
  total_po_lines: number;
  total_inv_lines: number;
  total_matched_lines: number;
}

export interface MatchSummary {
  confirmed: number;
  high_confidence: number;
  candidate: number;
  unmatched_po: number;
  unmatched_inv: number;
}

export interface PoLine {
  pf_code: string;
  product: string;
  qty: number;
  unit_price: number;
  total: number;
  po_number: string;
}

export interface InvLine {
  article_code: string;
  product: string;
  qty: number;
  unit_price: number;
  total: number;
  invoice_number: string;
}

export interface MatchedLine {
  match_level: MatchLevel;
  score: number;
  reason: string;
  po: PoLine;
  inv: InvLine;
  qty_variance: number;
  price_variance: number;
}

export interface Variance {
  type: VarianceType;
  severity: VarianceSeverity;
  detail: string;
  pf_code?: string;
  po_qty?: number;
  inv_qty?: number;
  article_code?: string;
  amount_eur?: number;
}

export interface ParserOutput {
  doc_type: string;
  doc_number: string;
  doc_date: string;
  po_reference: string;
  supplier: string;
  brand: string;
  currency: string;
  lines: unknown[];
  doc_total: number;
  parse_warnings: string[];
}

export interface ErpPayload {
  pf_code: string;
  po_number: string;
  payload: Record<string, unknown>;
}

export interface SupplierRecon {
  supplier: string;
  status: SupplierStatus;
  po_numbers: string[];
  po_total: number;
  po_line_count: number;
  invoice_numbers: string[];
  invoice_dates: string[];
  invoice_total: number;
  invoice_line_count: number;
  variance: number;
  variance_pct: number;
  match_summary: MatchSummary;
  variances: Variance[];
  matched_lines: MatchedLine[];
  unmatched_po_lines: PoLine[];
  unmatched_inv_lines: InvLine[];
  raw_invoice_texts: Record<string, string>;
  parser_outputs: Record<string, ParserOutput>;
  erp_payloads: ErpPayload[];
}

export interface ReconciliationData {
  shipment_date: string;
  shipping_method: string;
  generated_at: string;
  summary: ReconciliationSummary;
  suppliers: SupplierRecon[];
}
