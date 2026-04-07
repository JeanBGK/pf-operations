export interface RawEvent {
  threadId: string;
  subject: string;
  family: string;
  type: string;
  date: string;
  summary: string;
  supplier: string;
  claimCode: string;
  amount: string;
  products: string[];
  route: string;
  suppliers: string[];
  packing: string;
  forwarder: string;
  shipmentDate: string;
  isRevision: boolean;
  suppliersRemoved: string[];
  revisionReason: string;
  confidence: number;
  disposition: string;
}

export type SupplierStatus = 'confirmed' | 'pending' | 'missing' | 'exception' | 'removed';
export type BoxAssignment = 'A' | 'B' | 'Frozen' | 'none';

export interface RecapSupplier {
  name: string;
  included: boolean;
  status: SupplierStatus;
  box: BoxAssignment;
  notes: string;
  missingProducts: string[];
  exceptionSummary: string;
  confirmationSummary: string;
}

export interface ShipmentWeek {
  weekKey: string;       // e.g., "2026-W13"
  france: ShipmentDay | null;
  italy: ShipmentDay | null;
}

export interface ShipmentDay {
  date: string;
  route: string;
  forwarder: string;
  suppliers: string[];
  packing: string;
  revised: boolean;
  suppliersRemoved: string[];
  revisionReason: string;
}

export interface WeekSummary {
  weekKey: string;
  exceptions: number;
  missing: number;
  confirmed: number;
  claims: number;
  invoices: number;
  recaps: number;
}
