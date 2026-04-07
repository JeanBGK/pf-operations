'use client';

import { useState } from 'react';
import type { SupplierRecon, MatchedLine, PoLine, InvLine, ErpPayload, ParserOutput } from '@/lib/reconciliation-types';
import SourceModal from './SourceModal';

const STATUS_STYLES: Record<string, string> = {
  MATCHED: 'bg-green-100 text-green-800',
  VARIANCE: 'bg-amber-100 text-amber-800',
  MISSING_INVOICE: 'bg-red-100 text-red-800',
  NO_INVOICE: 'bg-red-100 text-red-800',
  NO_PARSER: 'bg-gray-100 text-gray-600',
  REVIEW: 'bg-amber-100 text-amber-800',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function fmtEur(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

function fmtQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

// --- Situation types and grouping ---

interface SituationItem {
  situation: 'missing' | 'added' | 'qty_diff' | 'substitution' | 'price_diff' | 'all_good';
  // For missing items (PO line, no invoice match)
  poLine?: PoLine;
  // For added items (invoice line, no PO match)
  invLine?: InvLine;
  // For matched items (qty diff, price diff, substitution, all good)
  matched?: MatchedLine;
}

const SITUATION_ORDER: SituationItem['situation'][] = [
  'missing', 'added', 'qty_diff', 'substitution', 'price_diff', 'all_good',
];

const SITUATION_CONFIG: Record<SituationItem['situation'], {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  defaultCollapsed: boolean;
}> = {
  missing: { label: 'Missing items', color: 'text-red-700', bgColor: 'bg-red-50', icon: '!', defaultCollapsed: false },
  added: { label: 'Added items', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: '+', defaultCollapsed: false },
  qty_diff: { label: 'Quantity differences', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: '\u0394', defaultCollapsed: false },
  substitution: { label: 'Substitutions', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: '?', defaultCollapsed: false },
  price_diff: { label: 'Price differences', color: 'text-amber-700', bgColor: 'bg-amber-50', icon: '\u20AC', defaultCollapsed: false },
  all_good: { label: 'All good', color: 'text-green-700', bgColor: 'bg-green-50', icon: '\u2713', defaultCollapsed: true },
};

function classifyItems(supplier: SupplierRecon): SituationItem[] {
  const items: SituationItem[] = [];

  // Missing: PO lines with no invoice match (exclude qty=0 cancelled lines)
  for (const po of supplier.unmatched_po_lines) {
    if (po.qty > 0) {
      items.push({ situation: 'missing', poLine: po });
    }
  }

  // Added: invoice lines with no PO match
  for (const inv of supplier.unmatched_inv_lines) {
    items.push({ situation: 'added', invLine: inv });
  }

  // Matched lines: classify by variance type
  for (const m of supplier.matched_lines) {
    const hasQtyDiff = Math.abs(m.qty_variance) > 0.01;
    const hasPriceDiff = Math.abs(m.price_variance) > 0.001;
    const isSubstitution = m.match_level === 'CANDIDATE';

    if (isSubstitution) {
      items.push({ situation: 'substitution', matched: m });
    } else if (hasQtyDiff && hasPriceDiff) {
      // Both — show under qty_diff (more operationally important)
      items.push({ situation: 'qty_diff', matched: m });
    } else if (hasQtyDiff) {
      items.push({ situation: 'qty_diff', matched: m });
    } else if (hasPriceDiff) {
      items.push({ situation: 'price_diff', matched: m });
    } else {
      items.push({ situation: 'all_good', matched: m });
    }
  }

  return items;
}

function groupBySituation(items: SituationItem[]): Map<SituationItem['situation'], SituationItem[]> {
  const groups = new Map<SituationItem['situation'], SituationItem[]>();
  for (const sit of SITUATION_ORDER) {
    const group = items.filter(i => i.situation === sit);
    if (group.length > 0) {
      groups.set(sit, group);
    }
  }
  return groups;
}

function eurImpact(items: SituationItem[]): number {
  let total = 0;
  for (const item of items) {
    if (item.situation === 'missing' && item.poLine) {
      total -= item.poLine.total; // ordered but not invoiced
    } else if (item.situation === 'added' && item.invLine) {
      total += item.invLine.total; // invoiced but not ordered
    } else if (item.matched) {
      total += (item.matched.inv.total - item.matched.po.total);
    }
  }
  return total;
}

// --- Sub-components for each row type ---

function MissingRow({ po }: { po: PoLine }) {
  return (
    <tr className="border-t hover:bg-red-50/50">
      <td className="px-2 py-1.5 font-mono text-xs">{po.pf_code}</td>
      <td className="px-2 py-1.5 text-xs max-w-[250px] truncate" title={po.product}>{po.product}</td>
      <td className="px-2 py-1.5 text-xs text-right">{fmtQty(po.qty)}</td>
      <td className="px-2 py-1.5 text-xs text-right">{po.unit_price.toFixed(2)}</td>
      <td className="px-2 py-1.5 text-xs text-right font-medium text-red-600">{fmtEur(po.total)}</td>
      <td className="px-2 py-1.5 text-xs text-gray-400 font-mono">{po.po_number}</td>
    </tr>
  );
}

function AddedRow({ inv, onShowSource }: { inv: InvLine; onShowSource: (n: string) => void }) {
  return (
    <tr className="border-t hover:bg-amber-50/50">
      <td className="px-2 py-1.5 font-mono text-xs">{inv.article_code || '-'}</td>
      <td className="px-2 py-1.5 text-xs max-w-[250px] truncate" title={inv.product}>{inv.product}</td>
      <td className="px-2 py-1.5 text-xs text-right">{fmtQty(inv.qty)}</td>
      <td className="px-2 py-1.5 text-xs text-right">{inv.unit_price.toFixed(2)}</td>
      <td className="px-2 py-1.5 text-xs text-right font-medium text-amber-600">{fmtEur(inv.total)}</td>
      <td className="px-2 py-1.5 text-xs">
        <button onClick={() => onShowSource(inv.invoice_number)} className="text-blue-600 hover:underline font-mono">
          {inv.invoice_number}
        </button>
      </td>
    </tr>
  );
}

function MatchedRow({ m, onShowSource }: { m: MatchedLine; onShowSource: (n: string) => void }) {
  const qtyDiff = m.qty_variance;
  const priceDiff = m.price_variance;
  const pricePct = m.po.unit_price !== 0 ? (priceDiff / m.po.unit_price) * 100 : 0;

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-2 py-1.5 font-mono text-xs">{m.po.pf_code}</td>
      <td className="px-2 py-1.5 text-xs max-w-[250px]">
        <div className="truncate" title={m.po.product}>{m.po.product}</div>
        {m.po.product !== m.inv.product && (
          <div className="text-gray-400 truncate text-[10px]" title={m.inv.product}>inv: {m.inv.product}</div>
        )}
      </td>
      <td className="px-2 py-1.5 text-xs text-right">
        <span>{fmtQty(m.po.qty)}</span>
        {qtyDiff !== 0 && (
          <span className={`ml-1 font-medium ${qtyDiff > 0 ? 'text-amber-600' : 'text-red-600'}`}>
            ({qtyDiff > 0 ? '+' : ''}{fmtQty(qtyDiff)})
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-xs text-right">
        <span>{m.po.unit_price.toFixed(2)}</span>
        {priceDiff !== 0 && (
          <span className={`ml-1 font-medium ${Math.abs(pricePct) >= 5 ? 'text-red-600' : 'text-amber-600'}`}>
            ({priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)})
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-xs text-right">{fmtEur(m.inv.total)}</td>
      <td className="px-2 py-1.5 text-xs">
        <button onClick={() => onShowSource(m.inv.invoice_number)} className="text-blue-600 hover:underline font-mono">
          {m.inv.article_code || m.inv.invoice_number}
        </button>
      </td>
    </tr>
  );
}

// --- Section component ---

function SituationSection({ situation, items, onShowSource }: {
  situation: SituationItem['situation'];
  items: SituationItem[];
  onShowSource: (invoiceNumber: string) => void;
}) {
  const config = SITUATION_CONFIG[situation];
  const [collapsed, setCollapsed] = useState(config.defaultCollapsed);
  const impact = eurImpact(items);

  return (
    <div className="mb-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-t ${config.bgColor} ${collapsed ? 'rounded-b' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${config.color}`}>
            {config.icon}
          </span>
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-gray-500">({items.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {impact !== 0 && situation !== 'all_good' && (
            <span className={`text-xs font-medium ${impact > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              {impact > 0 ? '+' : ''}{fmtEur(impact)}
            </span>
          )}
          <span className="text-gray-400 text-xs">{collapsed ? '\u25BC' : '\u25B2'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="border border-t-0 rounded-b overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-2 py-1.5 font-medium w-20">Code</th>
                <th className="px-2 py-1.5 font-medium">Product</th>
                <th className="px-2 py-1.5 font-medium text-right w-20">Qty</th>
                <th className="px-2 py-1.5 font-medium text-right w-20">Price</th>
                <th className="px-2 py-1.5 font-medium text-right w-24">Total</th>
                <th className="px-2 py-1.5 font-medium w-24">Ref</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                if (item.situation === 'missing' && item.poLine) {
                  return <MissingRow key={i} po={item.poLine} />;
                }
                if (item.situation === 'added' && item.invLine) {
                  return <AddedRow key={i} inv={item.invLine} onShowSource={onShowSource} />;
                }
                if (item.matched) {
                  return <MatchedRow key={i} m={item.matched} onShowSource={onShowSource} />;
                }
                return null;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export default function SupplierCard({ supplier }: { supplier: SupplierRecon }) {
  const [expanded, setExpanded] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    invoiceNumber?: string;
    rawText?: string;
    parserOutput?: ParserOutput;
    erpPayload?: ErpPayload;
  }>({ isOpen: false });

  const s = supplier;
  const items = classifyItems(s);
  const groups = groupBySituation(items);

  const issueCount = items.filter(i => i.situation !== 'all_good').length;
  const goodCount = items.filter(i => i.situation === 'all_good').length;

  const varianceColor =
    s.status === 'MATCHED'
      ? 'border-green-400'
      : s.status === 'VARIANCE' || s.status === 'REVIEW'
        ? 'border-amber-400'
        : s.status === 'NO_INVOICE' || s.status === 'MISSING_INVOICE'
          ? 'border-red-400'
          : 'border-gray-300';

  function showSource(invoiceNumber: string) {
    const raw = s.raw_invoice_texts[invoiceNumber];
    const parser = s.parser_outputs[invoiceNumber];
    const matchedPfCodes = s.matched_lines
      .filter((m) => m.inv.invoice_number === invoiceNumber)
      .map((m) => m.po.pf_code);
    const erp = s.erp_payloads.find((e) => matchedPfCodes.includes(e.pf_code));

    setModalState({
      isOpen: true,
      invoiceNumber,
      rawText: raw,
      parserOutput: parser,
      erpPayload: erp,
    });
  }

  return (
    <>
      <div className={`bg-white rounded-lg shadow border-l-4 ${varianceColor}`}>
        {/* Summary header */}
        <button
          className="w-full text-left px-5 py-4"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold">{s.supplier}</h3>
            <StatusBadge status={s.status} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm mb-2">
            <div>
              <span className="text-gray-500">Ordered</span>{' '}
              <span className="font-medium">{fmtEur(s.po_total)}</span>{' '}
              <span className="text-gray-400 text-xs">{s.po_line_count} lines</span>
            </div>
            <div>
              <span className="text-gray-500">Invoiced</span>{' '}
              <span className="font-medium">{fmtEur(s.invoice_total)}</span>{' '}
              <span className="text-gray-400 text-xs">{s.invoice_line_count} lines</span>
            </div>
            <div>
              <span className="text-gray-500">Variance</span>{' '}
              <span className={`font-medium ${s.variance === 0 ? 'text-green-600' : Math.abs(s.variance_pct) >= 5 ? 'text-red-600' : 'text-amber-600'}`}>
                {fmtEur(s.variance)}
              </span>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            {issueCount > 0 && <span className="text-amber-600">{issueCount} items need attention</span>}
            {goodCount > 0 && <span className="text-green-600">{goodCount} all good</span>}
            <span className="ml-auto text-gray-400">{expanded ? 'Collapse \u25B2' : 'Details \u25BC'}</span>
          </div>
        </button>

        {/* Expanded detail: unified product list by situation */}
        {expanded && (
          <div className="border-t px-5 py-4">
            {SITUATION_ORDER.map(sit => {
              const group = groups.get(sit);
              if (!group) return null;
              return (
                <SituationSection
                  key={sit}
                  situation={sit}
                  items={group}
                  onShowSource={showSource}
                />
              );
            })}
          </div>
        )}
      </div>

      <SourceModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        supplierName={s.supplier}
        invoiceNumber={modalState.invoiceNumber}
        rawText={modalState.rawText}
        parserOutput={modalState.parserOutput}
        erpPayload={modalState.erpPayload}
      />
    </>
  );
}
