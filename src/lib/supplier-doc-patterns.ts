/**
 * Supplier Document Patterns
 * Codified from 3-week analysis (W11, W12, W13 of March 2026)
 *
 * Each supplier has a predictable pattern for:
 * - What document they send (invoice, order confirmation, proforma, price list)
 * - Who sends it (email address)
 * - When it arrives relative to shipment date
 * - What format it's in (PDF, XLSX)
 * - How to find it in the email archive
 */

export interface SupplierDocPattern {
  supplierName: string;           // ERP canonical name
  erpSupplierNames: string[];     // All names used in ERP
  route: 'france' | 'italy' | 'both' | 'local';

  // Pre-shipment document (what to compare against PO)
  preShipmentDoc: {
    type: 'invoice' | 'order_confirmation' | 'proforma' | 'price_list' | 'yield_report' | 'lab_cert' | 'consolidated';
    senderEmails: string[];
    senderDomains: string[];
    filenamePatterns: string[];    // regex patterns
    timing: 'on_shipment' | 'day_before' | 'day_after' | '2_5_days_before' | 'weekly';
    format: 'pdf' | 'xlsx' | 'both';
  };

  // Invoice (may be different from pre-shipment doc)
  invoiceDoc?: {
    senderEmails: string[];
    senderDomains: string[];
    filenamePatterns: string[];
    timing: 'on_shipment' | 'day_after' | 'same_as_pre';
    format: 'pdf' | 'xlsx';
  };

  // Matching hints
  notes: string;
}

export const SUPPLIER_DOC_PATTERNS: SupplierDocPattern[] = [
  // === FRENCH SUPPLIERS ===
  {
    supplierName: 'Demarne',
    erpSupplierNames: ['Demarne'],
    route: 'france',
    preShipmentDoc: {
      type: 'order_confirmation',
      senderEmails: ['bilal.benyoub@demarne.fr', 'lucie.christophe@demarne.fr', 'matthieu.avoledo@demarne.fr'],
      senderDomains: ['demarne.fr'],
      filenamePatterns: ['Commande_client_\\d+\\.pdf'],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    invoiceDoc: {
      senderEmails: ['sandrine.ciray@demarne.fr', 'noreply@demarne.fr', 'audrey.louis-michel@demarne.fr'],
      senderDomains: ['demarne.fr'],
      filenamePatterns: ['Facture_\\d+\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Sends order confirmations 2-5 days before with exact products/qty. Invoice on shipment day. 4 POs → 2 invoices typical. Subject: "Votre commande XXXX à expédier au : DD/MM/YYYY"',
  },
  {
    supplierName: 'Le Delas',
    erpSupplierNames: ['Le Delas'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['caisse@ledelas.fr', 'c.kanaan@ledelas.fr', 'e.vif@ledelas.fr', 't.lecour@ledelas.fr'],
      senderDomains: ['ledelas.fr'],
      filenamePatterns: ['LE DELAS Le Delas \\d+\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Invoice IS the pre-shipment doc. Subject: "Votre facture XXXXXXXX LE DELAS". Multiple invoices per shipment (products split across invoices).',
  },
  {
    supplierName: 'Desailly',
    erpSupplierNames: ['Desailly'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['noreply1@desailly.fr'],
      senderDomains: ['desailly.fr'],
      filenamePatterns: ['D\\d+\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Automated invoice from noreply. Subject: "[000497.01 - FDX CO LTD] Facture DXXXXXXXXX du DD/MM/YYYY"',
  },
  {
    supplierName: 'Blanc',
    erpSupplierNames: ['Blanc'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['administration@blanclapassion.fr'],
      senderDomains: ['blanclapassion.fr'],
      filenamePatterns: ['facture-\\d+\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Legal name: Maison Blanc / BLANC SAS. Subject: "[Maison Blanc] - Votre facture n°XXXXXXXX est disponible."',
  },
  {
    supplierName: 'Roland',
    erpSupplierNames: ['Roland'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['roland@latablederoland.fr'],
      senderDomains: ['latablederoland.fr'],
      filenamePatterns: ['WDEEDITFAC\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'SAME FILENAME every week (WDEEDITFAC.pdf). Must match by date. Subject: "FDX BKK". Also sends asparagus/mushroom price lists as separate PDFs.',
  },
  {
    supplierName: 'iShop4You/GMAPB',
    erpSupplierNames: ['ISHOP4YOU'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['alex@gmapb.com'],
      senderDomains: ['gmapb.com'],
      filenamePatterns: ['FA\\d+\\.PDF'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Legal name: SARL GMAPB / Alexandre PLISSON. Delivery notes from julien@gmapb.com (TELEFEL PDFs). Subject: "GMAPB - FACTURES CLIENTS - ETAT - FAXXXXXXXXX - DD/MM/YYYY"',
  },
  {
    supplierName: 'Paris Saveurs',
    erpSupplierNames: ['Paris Saveurs'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['confirmeps@gmail.com'],
      senderDomains: ['gmail.com'],
      filenamePatterns: ['FA\\d+\\.PDF'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Sends from confirmeps@gmail.com — NOT from a parissaveurs domain. Subject: "PARIS SAVEURS - FAXXXXXXXXX - DD/MM/YYYY"',
  },
  {
    supplierName: 'Prodilac',
    erpSupplierNames: ['Prodilac'],
    route: 'france',
    preShipmentDoc: {
      type: 'order_confirmation',
      senderEmails: ['aurelien.brard@aufromagerderungis.com'],
      senderDomains: ['aufromagerderungis.com'],
      filenamePatterns: [],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    notes: 'Operates through intermediary "Au Fromager de Rungis". Confirmation may be in email body, not attachment. Easter order form from sandrine.mazet@desailly.fr as separate doc.',
  },
  {
    supplierName: 'Antony',
    erpSupplierNames: ['Antony'],
    route: 'france',
    preShipmentDoc: {
      type: 'price_list',
      senderEmails: ['cave@fromagerieantony.fr'],
      senderDomains: ['fromagerieantony.fr'],
      filenamePatterns: ['LISTE \\d+\\.xlsx'],
      timing: 'weekly',
      format: 'xlsx',
    },
    notes: 'Legal name: ANTONY ELEVEUR DE FROMAGES. Weekly LISTE spreadsheet = availability/order list. comptabilite@ for invoice reminders.',
  },
  {
    supplierName: 'Cap Horn',
    erpSupplierNames: ['Cap Horn'],
    route: 'france',
    preShipmentDoc: {
      type: 'lab_cert',
      senderEmails: ['contact@leshuitresducaphorn.com'],
      senderDomains: ['leshuitresducaphorn.com'],
      filenamePatterns: ['L\\.\\d+.*\\.pdf'],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    notes: 'Legal name: EARL LES HUITRES DU CAP HORN. Oyster farmer. Sends lab/health test results, not invoices. Order confirmation likely in email body or phone.',
  },
  {
    supplierName: 'Lambert',
    erpSupplierNames: ['Lambert'],
    route: 'france',
    preShipmentDoc: {
      type: 'consolidated',
      senderEmails: [],
      senderDomains: [],
      filenamePatterns: ['FDX Holding Invoice.*lambert.*\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'No direct invoice from supplier. FDX (Phueng) creates holding invoice. Packing list also from Phueng.',
  },
  {
    supplierName: 'Kerber',
    erpSupplierNames: ['Kerber'],
    route: 'france',
    preShipmentDoc: {
      type: 'price_list',
      senderEmails: ['order@kerber.fr'],
      senderDomains: ['kerber.fr'],
      filenamePatterns: ['FDX-\\d+-\\d+-Tarif_VA\\.xlsx'],
      timing: 'weekly',
      format: 'xlsx',
    },
    notes: 'Legal name: VIVIERS D\'ARMOR. Daily tariff spreadsheets. Documents available via portal ("Your documents are ready!" from cindym@kerber.fr with 0 attachments). Invoice likely downloaded from portal.',
  },
  {
    supplierName: 'Reynaud',
    erpSupplierNames: ['Reynaud'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['reynaud.dematerialisevosfactures@rno.fr'],
      senderDomains: ['rno.fr'],
      filenamePatterns: ['Invoice \\d+\\.pdf'],
      timing: 'day_after',
      format: 'pdf',
    },
    notes: 'Invoice via dematerialisation portal. Daily quotations (T2) from cedric.gabrieli@rno.fr are price lists, not invoices.',
  },

  // === SPANISH SUPPLIERS ===
  {
    supplierName: 'Landaluz',
    erpSupplierNames: ['Landaluz'],
    route: 'france',
    preShipmentDoc: {
      type: 'proforma',
      senderEmails: ['exportacion@landaluz.es'],
      senderDomains: ['landaluz.es'],
      filenamePatterns: ['PROFORMA INVOICE.*PO \\d+.*\\.pdf', 'COMMERCIAL INVOICE.*PO \\d+.*\\.pdf'],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    invoiceDoc: {
      senderEmails: ['exportacion@landaluz.es'],
      senderDomains: ['landaluz.es'],
      filenamePatterns: ['COMMERCIAL INVOICE.*PO \\d+.*\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Umbrella for Txogitxu, Joselito, Incarlopsa, Bacalao Rafols, Don Bocarte, JABU. Sends proforma first, then commercial invoice + packing list per PO. PO number in filename.',
  },
  {
    supplierName: 'Olmeda',
    erpSupplierNames: ['Olmeda'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['info@olmedaorigenes.com', 'export@olmedaorigenes.com'],
      senderDomains: ['olmedaorigenes.com'],
      filenamePatterns: ['INVOICE \\d+.*\\.pdf', 'PACKING LIST \\d+.*\\.pdf'],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    notes: 'Sends invoice + packing list BEFORE shipment. SOA (statement of account) from facturas@olmedaorigenes.com separately.',
  },
  {
    supplierName: 'Guijuelo Gourmet',
    erpSupplierNames: ['Guijuelo Gourmet'],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['administracion@gugourmet.com'],
      senderDomains: ['gugourmet.com'],
      filenamePatterns: ['Packing List.*\\.pdf', 'FRA VE.*\\.pdf'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Packing list + commercial invoice. Documents arrive on or after shipment day.',
  },

  // === ITALIAN SUPPLIERS ===
  {
    supplierName: 'Mosca',
    erpSupplierNames: ['MOSCA GIUSEPPE'],
    route: 'italy',
    preShipmentDoc: {
      type: 'consolidated',
      senderEmails: ['logistica@mosca1948.it', 'filippo@mosca1948.it'],
      senderDomains: ['mosca1948.it'],
      filenamePatterns: [],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Invoices come through New Special consolidation. Mosca sends certificates (BRC/IFS) directly. FDX creates holding invoices.',
  },
  {
    supplierName: 'Valsana',
    erpSupplierNames: ['Valsana'],
    route: 'italy',
    preShipmentDoc: {
      type: 'consolidated',
      senderEmails: ['gianluca.dilello@valsana.it', 'corrocher@valsana.it'],
      senderDomains: ['valsana.it'],
      filenamePatterns: [],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Invoices through New Special. Statement of account from raffaele@newspecial.it.',
  },
  {
    supplierName: 'Agro/Fogliati',
    erpSupplierNames: ['Agro (Fogliati)'],
    route: 'italy',
    preShipmentDoc: {
      type: 'price_list',
      senderEmails: ['claudia.marini.orders@gmail.com'],
      senderDomains: ['gmail.com'],
      filenamePatterns: ['PREMIUM FDX.*W.*\\.xlsx'],
      timing: 'weekly',
      format: 'xlsx',
    },
    notes: 'Operates as Fogliati S.a.S. Price list = availability/order confirmation. Credit notes for claims come from same address.',
  },
  {
    supplierName: 'Team Tartufi',
    erpSupplierNames: ['Team tartufi'],
    route: 'italy',
    preShipmentDoc: {
      type: 'consolidated',
      senderEmails: ['matteo@teamtartufi.com', 'info@teamtartufi.com'],
      senderDomains: ['teamtartufi.com'],
      filenamePatterns: [],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Weekly offers sent as email body, not attachment. Invoices through New Special consolidation.',
  },
  {
    supplierName: 'Tartuflanghe',
    erpSupplierNames: ['Tartuflanghe'],
    route: 'both',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['export@tartuflanghe.com', 'marina@tartuflanghe.com', 'federica@tartuflanghe.com'],
      senderDomains: ['tartuflanghe.com'],
      filenamePatterns: [],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Ships both air (via France) and sea containers. Sea container invoices may come separately.',
  },
  {
    supplierName: 'New Special',
    erpSupplierNames: ['New Special'],
    route: 'italy',
    preShipmentDoc: {
      type: 'proforma',
      senderEmails: ['cristian@newspecial.it', 'marco@newspecial.it', 'samy@newspecial.it'],
      senderDomains: ['newspecial.it'],
      filenamePatterns: ['Fattura-ProForma.*\\.pdf'],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    notes: 'Italy freight forwarder. Proforma consolidates all Italian suppliers for the week. Statement of account from raffaele@newspecial.it.',
  },

  // === OTHER SUPPLIERS ===
  {
    supplierName: 'CEVA',
    erpSupplierNames: [],
    route: 'france',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['invoice.noreply@cevalogistics.com'],
      senderDomains: ['cevalogistics.com'],
      filenamePatterns: ['INVOICE - F\\d+ - FDXTHBKK.*\\.PDF'],
      timing: 'on_shipment',
      format: 'pdf',
    },
    notes: 'Freight forwarder, not a product supplier. Freight invoice, not comparable to POs. Credit notes follow same pattern with "TAX CREDIT NOTE" in filename.',
  },
  {
    supplierName: 'Be Fresh',
    erpSupplierNames: ['Be Fresh'],
    route: 'france',
    preShipmentDoc: {
      type: 'price_list',
      senderEmails: ['sales@befreshproduce.com'],
      senderDomains: ['befreshproduce.com'],
      filenamePatterns: ['Pricelist #\\d+\\.xlsx'],
      timing: 'weekly',
      format: 'xlsx',
    },
    notes: 'Dutch produce supplier. Twice-weekly price lists (2 per send — FOB and other). Invoice from administration@befreshproduce.com but not consistently in email archive.',
  },
  {
    supplierName: 'Zaap Alaska Seafood',
    erpSupplierNames: ['Zaap Alaska Seafood'],
    route: 'local',
    preShipmentDoc: {
      type: 'yield_report',
      senderEmails: ['alexei_asia@bk.ru'],
      senderDomains: ['bk.ru'],
      filenamePatterns: ['King Crab.*\\.xlsx', 'RM stock.*\\.xlsx'],
      timing: '2_5_days_before',
      format: 'xlsx',
    },
    notes: 'Local Thai supplier (Russian-owned). Yield report = what was actually processed vs PO. No formal invoice via email.',
  },
  {
    supplierName: 'Endeavour Meats',
    erpSupplierNames: ['Endeavour Meats'],
    route: 'both',
    preShipmentDoc: {
      type: 'invoice',
      senderEmails: ['harry@endeavourmeats.com.au'],
      senderDomains: ['endeavourmeats.com.au'],
      filenamePatterns: ['\\d+_Merged\\.pdf', '\\d+ Docs\\.pdf', '\\d+_Sales Order.*\\.pdf'],
      timing: '2_5_days_before',
      format: 'pdf',
    },
    notes: 'Australian meat supplier. Sales order + merged docs + export certificates. PO number in subject.',
  },
];

/**
 * Find the document pattern for a supplier
 */
export function findSupplierPattern(supplierName: string): SupplierDocPattern | undefined {
  const lower = supplierName.toLowerCase();
  return SUPPLIER_DOC_PATTERNS.find(p =>
    p.supplierName.toLowerCase() === lower
    || p.erpSupplierNames.some(n => n.toLowerCase() === lower)
    || p.supplierName.toLowerCase().includes(lower)
    || lower.includes(p.supplierName.toLowerCase())
  );
}

/**
 * Match a sender email to a supplier pattern
 */
export function findPatternBySender(senderEmail: string): SupplierDocPattern | undefined {
  const lower = senderEmail.toLowerCase();
  return SUPPLIER_DOC_PATTERNS.find(p => {
    const allEmails = [
      ...p.preShipmentDoc.senderEmails,
      ...(p.invoiceDoc?.senderEmails || []),
    ];
    if (allEmails.some(e => e.toLowerCase() === lower)) return true;
    const allDomains = [
      ...p.preShipmentDoc.senderDomains,
      ...(p.invoiceDoc?.senderDomains || []),
    ];
    const senderDomain = lower.split('@')[1];
    return allDomains.some(d => d === senderDomain);
  });
}
