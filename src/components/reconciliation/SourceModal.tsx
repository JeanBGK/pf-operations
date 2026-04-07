'use client';

import { useState } from 'react';
import type { ErpPayload, ParserOutput } from '@/lib/reconciliation-types';

type SourceTab = 'raw' | 'parser' | 'erp';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
  invoiceNumber?: string;
  rawText?: string;
  parserOutput?: ParserOutput;
  erpPayload?: ErpPayload;
}

export default function SourceModal({
  isOpen,
  onClose,
  supplierName,
  invoiceNumber,
  rawText,
  parserOutput,
  erpPayload,
}: SourceModalProps) {
  const [tab, setTab] = useState<SourceTab>('raw');

  if (!isOpen) return null;

  const tabs: { key: SourceTab; label: string; available: boolean }[] = [
    { key: 'raw', label: 'Raw Invoice Text', available: !!rawText },
    { key: 'parser', label: 'Parser Output', available: !!parserOutput },
    { key: 'erp', label: 'ERP Payload', available: !!erpPayload },
  ];

  const activeTab = tabs.find((t) => t.key === tab && t.available) ? tab : tabs.find((t) => t.available)?.key ?? 'raw';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">{supplierName}</h3>
            {invoiceNumber && <p className="text-sm text-gray-500">Invoice: {invoiceNumber}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => t.available && setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : t.available
                    ? 'border-transparent text-gray-500 hover:text-gray-700'
                    : 'border-transparent text-gray-300 cursor-not-allowed'
              }`}
              disabled={!t.available}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'raw' && rawText && (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded border">{rawText}</pre>
          )}
          {activeTab === 'parser' && parserOutput && (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded border">
              {JSON.stringify(parserOutput, null, 2)}
            </pre>
          )}
          {activeTab === 'erp' && erpPayload && (
            <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded border">
              {JSON.stringify(erpPayload.payload, null, 2)}
            </pre>
          )}
          {!rawText && !parserOutput && !erpPayload && (
            <p className="text-gray-500 text-sm">No source data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
