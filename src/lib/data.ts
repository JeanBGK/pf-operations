import rawEvents from '@/data/events.json';
import type { RawEvent, ShipmentWeek, ShipmentDay, WeekSummary, RecapSupplier, BoxAssignment } from './types';

const events = rawEvents as RawEvent[];

function isoWeek(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

export function getAllEvents(): RawEvent[] {
  return events;
}

export function getWeeks(): string[] {
  const weeks = new Set<string>();
  events.forEach(e => {
    const wk = isoWeek(e.date);
    if (wk && wk.startsWith('2026')) weeks.add(wk);
  });
  return [...weeks].sort();
}

export function getShipmentWeeks(): ShipmentWeek[] {
  const weekMap = new Map<string, ShipmentWeek>();

  events.filter(e => e.type === 'recap_sent' || e.type === 'recap_revised').forEach(e => {
    const shipDate = e.shipmentDate || e.date;
    if (!shipDate) return;
    const wk = isoWeek(shipDate);
    if (!wk || !wk.startsWith('2026')) return;

    if (!weekMap.has(wk)) {
      weekMap.set(wk, { weekKey: wk, france: null, italy: null });
    }
    const week = weekMap.get(wk)!;
    const route = e.route?.toLowerCase() || '';

    if (e.type === 'recap_sent') {
      const day: ShipmentDay = {
        date: shipDate,
        route: e.route || '',
        forwarder: e.forwarder || '',
        suppliers: e.suppliers || [],
        packing: e.packing || '',
        revised: false,
        suppliersRemoved: [],
        revisionReason: '',
      };
      if (route.includes('italy')) week.italy = day;
      else week.france = day;
    } else if (e.type === 'recap_revised') {
      const target = route.includes('italy') ? week.italy : week.france;
      if (target) {
        target.revised = true;
        target.suppliersRemoved = e.suppliersRemoved || [];
        target.revisionReason = e.revisionReason || '';
      }
    }
  });

  return [...weekMap.values()].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

export function getEventsForWeek(weekKey: string): RawEvent[] {
  return events.filter(e => {
    if (!e.date) return false;
    const wk = isoWeek(e.date);
    return wk === weekKey;
  });
}

export function getWeekSummary(weekKey: string): WeekSummary {
  const wkEvents = getEventsForWeek(weekKey);
  return {
    weekKey,
    exceptions: wkEvents.filter(e => e.type === 'delivery_exception' || e.type === 'exception_reported').length,
    missing: wkEvents.filter(e => e.type === 'missing_item_alert').length,
    confirmed: wkEvents.filter(e => e.type === 'shipment_confirmed').length,
    claims: wkEvents.filter(e => e.type.startsWith('claim_')).length,
    invoices: wkEvents.filter(e => e.type === 'invoice_received').length,
    recaps: wkEvents.filter(e => e.type.startsWith('recap_')).length,
  };
}

// --- Recap Builder Logic ---

// Standard Box A suppliers (from Cindy's emails)
const BOX_A_SUPPLIERS = ['cap horn', 'lambert', 'psk'];
const FROZEN_PATTERNS = ['frozen', 'peter\'s farm', 'moyseafood', 'incarlopsa', 'bacalao'];

function inferBox(supplierName: string): BoxAssignment {
  const lower = supplierName.toLowerCase();
  if (BOX_A_SUPPLIERS.some(s => lower.includes(s))) return 'A';
  if (lower.includes('gillardeau')) return 'A';
  if (FROZEN_PATTERNS.some(p => lower.includes(p))) return 'Frozen';
  if (lower.includes('demarne')) return 'A'; // Demarne gets split A+B but starts as A
  return 'B';
}

export function buildRecapSuppliers(weekKey: string, route: 'france' | 'italy'): RecapSupplier[] {
  const weeks = getShipmentWeeks();
  const week = weeks.find(w => w.weekKey === weekKey);
  const shipment = route === 'france' ? week?.france : week?.italy;

  if (!shipment) return [];

  const wkEvents = getEventsForWeek(weekKey);

  // Get confirmed suppliers
  const confirmedMap = new Map<string, string>();
  wkEvents.filter(e => e.type === 'shipment_confirmed' && e.supplier).forEach(e => {
    confirmedMap.set(e.supplier.toLowerCase(), e.summary);
  });

  // Get missing items by supplier
  const missingMap = new Map<string, string[]>();
  wkEvents.filter(e => e.type === 'missing_item_alert').forEach(e => {
    const sup = (e.supplier || 'Unknown').toLowerCase();
    if (!missingMap.has(sup)) missingMap.set(sup, []);
    missingMap.get(sup)!.push(...e.products);
  });

  // Get exceptions
  const exceptionMap = new Map<string, string>();
  wkEvents.filter(e => e.type === 'delivery_exception').forEach(e => {
    if (e.supplier) {
      exceptionMap.set(e.supplier.toLowerCase(), e.summary);
    }
  });

  // Build supplier list from recap
  const suppliers: RecapSupplier[] = shipment.suppliers.map(name => {
    const lower = name.toLowerCase();

    // Determine status
    let status: RecapSupplier['status'] = 'pending';
    let confirmationSummary = '';
    let missingProducts: string[] = [];
    let exceptionSummary = '';

    // Check if confirmed
    for (const [key, summary] of confirmedMap.entries()) {
      if (key.includes(lower) || lower.includes(key.split(' ')[0])) {
        status = 'confirmed';
        confirmationSummary = summary;
        break;
      }
    }

    // Check if missing
    for (const [key, products] of missingMap.entries()) {
      if (key.includes(lower) || lower.includes(key.split(' ')[0])) {
        status = 'missing';
        missingProducts = products;
        break;
      }
    }

    // Check if exception
    for (const [key, summary] of exceptionMap.entries()) {
      if (key.includes(lower) || lower.includes(key.split(' ')[0])) {
        if (status !== 'missing') status = 'exception';
        exceptionSummary = summary;
        break;
      }
    }

    // Check if removed in revision
    if (shipment.suppliersRemoved.some(r => r.toLowerCase().includes(lower))) {
      status = 'removed';
    }

    return {
      name,
      included: status !== 'removed',
      status,
      box: route === 'france' ? inferBox(name) : 'none' as BoxAssignment,
      notes: '',
      missingProducts,
      exceptionSummary,
      confirmationSummary,
    };
  });

  return suppliers;
}

// --- Next Shipment Draft ---

export interface NextShipmentDraft {
  date: string;
  route: 'france' | 'italy';
  forwarder: string;
  packing: string;
  suppliers: RecapSupplier[];
  basedOn: string; // week key of the source recap
  recentIssues: Array<{ supplier: string; issue: string; date: string }>;
}

export function buildNextShipmentDraft(route: 'france' | 'italy'): NextShipmentDraft | null {
  const weeks = getShipmentWeeks();

  // Find the most recent recap for this route
  let lastRecap: ShipmentDay | null = null;
  let lastWeekKey = '';
  for (const week of weeks) {
    const shipment = route === 'france' ? week.france : week.italy;
    if (shipment && shipment.suppliers.length > 0) {
      lastRecap = shipment;
      lastWeekKey = week.weekKey;
      break; // weeks are sorted descending
    }
  }

  if (!lastRecap) return null;

  // Compute next shipment date (France = Tuesday, Italy = Thursday)
  const lastDate = new Date(lastRecap.date + 'T00:00:00');
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + 7);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  // Collect recent issues (last 3 weeks) to flag for Cindy
  const recentIssues: Array<{ supplier: string; issue: string; date: string }> = [];
  const threeWeeksAgo = new Date(nextDate);
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
  const cutoff = threeWeeksAgo.toISOString().split('T')[0];

  events.filter(e => e.date >= cutoff && (
    e.type === 'missing_item_alert' || e.type === 'delivery_exception'
  )).forEach(e => {
    recentIssues.push({
      supplier: e.supplier || 'Unknown',
      issue: e.type === 'missing_item_alert'
        ? `Missing: ${e.products.join(', ')}`
        : e.summary.substring(0, 100),
      date: e.date,
    });
  });

  // Build supplier list — all pending (no confirmations yet for next week)
  const suppliers: RecapSupplier[] = lastRecap.suppliers.map(name => {
    const lower = name.toLowerCase();

    // Check if this supplier had recent issues
    const supplierIssues = recentIssues.filter(ri =>
      ri.supplier.toLowerCase().includes(lower.split(' ')[0]) ||
      lower.includes(ri.supplier.toLowerCase().split(' ')[0])
    );

    let notes = '';
    if (supplierIssues.length > 0) {
      notes = supplierIssues.map(ri => `${ri.date}: ${ri.issue.substring(0, 60)}`).join('; ');
    }

    return {
      name,
      included: true,
      status: 'pending' as const,
      box: route === 'france' ? inferBox(name) : 'none' as BoxAssignment,
      notes,
      missingProducts: [],
      exceptionSummary: supplierIssues.find(ri => ri.issue.startsWith('Missing'))?.issue || '',
      confirmationSummary: '',
    };
  });

  return {
    date: nextDateStr,
    route,
    forwarder: route === 'france' ? 'CEVA' : 'New Special',
    packing: lastRecap.packing,
    suppliers,
    basedOn: lastWeekKey,
    recentIssues,
  };
}
