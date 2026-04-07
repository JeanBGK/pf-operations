/**
 * Invoice Line Parsers
 * Each supplier has a different invoice format.
 * Parsers extract structured line items from the PDF extracted text.
 */

export interface InvoiceLine {
  product: string;
  articleCode: string;
  qty: number;
  unit: string;         // KG, P (piece), U (unit), CS (case)
  unitPrice: number;
  totalPrice: number;
  lot?: string;
}

export interface ParsedInvoice {
  supplier: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerRef: string;   // PO number or client reference
  lines: InvoiceLine[];
  totalHT: number;       // Total excluding tax
  currency: string;
  parseErrors: string[];
}

// --- Helpers ---

function parseEurNumber(s: string): number {
  if (!s) return 0;
  // Handle European number format: 1.234,56 or 1 234,56
  return parseFloat(s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function cleanText(s: string): string {
  return s.replace(/\r/g, '').replace(/\n+/g, '\n').trim();
}

// --- DEMARNE ---
// Format: article_code  qty  unit  weight  price  total  product_name
// Lines start with article codes like "59 2100"

export function parseDemarne(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  // Extract invoice number
  const invMatch = clean.match(/FACTURE N°\s*(\d+)/);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  // Extract date
  const dateMatch = clean.match(/Le (\d{2}-\d{2}-\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('-').reverse().join('-') : '';

  // Extract PO reference
  const poMatch = clean.match(/Commande\s*:\s*(\w+)/);
  const customerRef = poMatch ? poMatch[1] : '';

  // Parse line items
  // Pattern: article_code qty unit weight price total PRODUCT_NAME
  const lines: InvoiceLine[] = [];
  const lineRegex = /(\d{2}\s\d{4})\s+(\d+)\s+KG\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+EX\n(.+?)(?=\n(?:\d{2}\s\d{4}|Bordereau|Total|A suivre))/gs;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    const productLines = match[9].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('Lot') && !l.startsWith('Elevé') && !l.startsWith('Certifié'));
    lines.push({
      product: productLines[0] || '',
      articleCode: match[1].replace(/\s/g, ''),
      qty: parseEurNumber(match[5]),  // POIDS TOTAL
      unit: 'KG',
      unitPrice: parseEurNumber(match[7]),
      totalPrice: parseEurNumber(match[8]),
    });
  }

  // Simpler fallback: look for product lines with prices
  if (lines.length === 0) {
    const simpleRegex = /(\d{2}\s?\d{4})\s.*?(\d+[,\.]\d+)\s*\n\s*(?:EX\n)?(.+?)(?=\n)/g;
    let m;
    while ((m = simpleRegex.exec(clean)) !== null) {
      lines.push({
        product: m[3].trim(),
        articleCode: m[1].replace(/\s/g, ''),
        qty: 0,
        unit: 'KG',
        unitPrice: 0,
        totalPrice: parseEurNumber(m[2]),
      });
    }
    if (lines.length === 0) errors.push('No lines parsed with any method');
  }

  // Extract total
  const totalMatch = clean.match(/Total.*?H\.?T\.?\s*:?\s*([\d\s,\.]+)/i);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'Demarne',
    invoiceNumber,
    invoiceDate,
    customerRef,
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- LE DELAS ---
// Format: PRODUCT_NAME  customs_code  article  qty  unit  price  /unit  tax  total

export function parseLeDelas(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/(?:Facture|N° document)\s*(\d+)/);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const poMatch = clean.match(/Réf\. Cli\.?\s*\n?\s*(\d+)/);
  const customerRef = poMatch ? poMatch[1] : '';

  const lines: InvoiceLine[] = [];
  // Pattern: PRODUCT_NAME  customs_code  article_code  qty  P/K  price  /P or /K  HCE  total
  const lineRegex = /^(.+?)\s+\d{4}\s\d{2}\s\d{2}(?:\s\d{2})?\s+(\d+)\s+(\d+)\s+(P|K)\s+([\d,]+)\s+\/(P|K)\s+HCE\s+([\d,]+)/gm;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    lines.push({
      product: match[1].trim(),
      articleCode: match[2],
      qty: parseInt(match[3]),
      unit: match[4] === 'P' ? 'PC' : 'KG',
      unitPrice: parseEurNumber(match[5]),
      totalPrice: parseEurNumber(match[7]),
    });
  }

  if (lines.length === 0) errors.push('No lines parsed');

  const totalMatch = clean.match(/TOTAL HORS TAXES\s*:?\s*([\d\s,\.]+)/i);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'Le Delas',
    invoiceNumber,
    invoiceDate,
    customerRef,
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- LANDALUZ ---
// Format: tabular with UNITS | TOTAL WEIGHT | PRICE KILO/UNIT | TOTAL PRICE
// Product descriptions appear after/below the numbers

export function parseLandaluz(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/Invoice\s*(?:number|Number)?\s*:?\s*(EXP\d+\/\d+)/i);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const poMatch = clean.match(/PO\s*(\d+)/);
  const customerRef = poMatch ? poMatch[1] : '';

  const lines: InvoiceLine[] = [];
  // Products appear as (CODE) Product Name after the number block
  const productRegex = /\((\d+)\)\s+(.+?)(?=\n\d|\n\(|\nTOTAL|$)/gs;
  const numberLines = clean.match(/^\d+\s+[\d,]+\s+[\d,]+\s*€\s+[\d,]+\s*€/gm) || [];

  let prodMatch;
  const products: Array<{code: string; name: string}> = [];
  while ((prodMatch = productRegex.exec(clean)) !== null) {
    products.push({ code: prodMatch[1], name: prodMatch[2].trim().split('\n')[0] });
  }

  // Match number lines to products
  for (let i = 0; i < Math.min(numberLines.length, products.length); i++) {
    const nums = numberLines[i].match(/([\d,]+)/g);
    if (nums && nums.length >= 3) {
      const units = parseEurNumber(nums[0]);
      const weight = parseEurNumber(nums[1]);
      const price = parseEurNumber(nums[2]);
      const total = nums.length >= 4 ? parseEurNumber(nums[3]) : weight * price;

      // Skip packaging lines (price 0.05€)
      if (price <= 0.10) continue;

      lines.push({
        product: products[i]?.name || `Item ${i + 1}`,
        articleCode: products[i]?.code || '',
        qty: weight > 0 ? weight : units,
        unit: weight > 0 ? 'KG' : 'PC',
        unitPrice: price,
        totalPrice: total,
      });
    }
  }

  if (lines.length === 0) errors.push('No lines parsed');

  const totalMatch = clean.match(/TOTAL\s*(?:DUE|GOODS).*?([\d\s,\.]+)\s*€/i);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'Landaluz',
    invoiceNumber,
    invoiceDate,
    customerRef,
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- BLANC (Maison Blanc) ---
// Format: qty  weight  unit  price  total  PRODUCT_NAME

export function parseBlanc(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/No Facture\s*\n?\s*(\d+)/);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const poMatch = clean.match(/26\d{6}/);
  const customerRef = poMatch ? poMatch[0] : '';

  const lines: InvoiceLine[] = [];
  // Pattern: qty  weight  unit  price  total  PRODUCT_NAME
  const lineRegex = /(\d+)\s+([\d,]+)\s+(\d+)?\s*(U|K|P)\s+([\d,]+)\s+([\d,]+)\s*\n(.+?)(?=\n\d|\n\*|$)/gm;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    const productName = match[7].trim().split('\n')[0];
    if (productName.match(/^[A-Z]/) && !productName.startsWith('Lot') && !productName.startsWith('Nombre')) {
      lines.push({
        product: productName,
        articleCode: '',
        qty: parseEurNumber(match[2]),
        unit: match[4] === 'K' ? 'KG' : match[4] === 'U' ? 'PC' : 'PC',
        unitPrice: parseEurNumber(match[5]),
        totalPrice: parseEurNumber(match[6]),
      });
    }
  }

  if (lines.length === 0) errors.push('No lines parsed');

  const totalMatch = clean.match(/Montant H\.T\.\s*([\d\s,\.]+)/);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'Blanc',
    invoiceNumber,
    invoiceDate,
    customerRef,
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- DESAILLY ---
// Format: GENCODE  code  PRODUCT  unit  qty  weight  gross_price  net_price  total

export function parseDesailly(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/N° Pièce\s*\n?\s*(D\d+)/);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/Date\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const poMatch = clean.match(/référence\s*:\s*([\d+\s\/]+)/i);
  const customerRef = poMatch ? poMatch[1].trim() : '';

  const lines: InvoiceLine[] = [];
  // Pattern: code PRODUCT (provenance) lot info - weight - qty COL  unit price total
  const lineRegex = /(\d{6})\s*\n(.+?)(?:\n.+?)?\nLot.*?-\s*([\d,]+)\s*KG\s*-\s*(\d+)\s*COL\s*\n(KG|PI)\s+\d+\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/gs;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    lines.push({
      product: match[2].trim(),
      articleCode: match[1],
      qty: parseEurNumber(match[3]),
      unit: match[5] === 'PI' ? 'PC' : 'KG',
      unitPrice: parseEurNumber(match[8]),
      totalPrice: parseEurNumber(match[9]),
    });
  }

  if (lines.length === 0) errors.push('No lines parsed with regex, trying simple');

  const totalMatch = clean.match(/Montant H\.T\.\s*([\d\s,\.]+)/);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'Desailly',
    invoiceNumber,
    invoiceDate,
    customerRef,
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- GMAPB (iShop4You) ---
// Format: qty  PRODUCT (origin)  weight  price  total

export function parseGMAPB(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/\n(FA\d+)\n/);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const lines: InvoiceLine[] = [];
  // Pattern: qty  PRODUCT (ORIGIN)  weight  price  total
  const lineRegex = /(\d+)\s*\n(.+?)\s{2,}(.+?)\s*\n([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*\n(K|U|P)/gm;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    const product = match[2].trim();
    const origin = match[3].trim();
    lines.push({
      product: `${product} ${origin}`,
      articleCode: '',
      qty: parseEurNumber(match[4]), // weight
      unit: match[8] === 'K' ? 'KG' : 'PC',
      unitPrice: parseEurNumber(match[6]),
      totalPrice: parseEurNumber(match[7]),
    });
  }

  // Simpler fallback
  if (lines.length === 0) {
    const simpleRegex = /(\d+)\n(.+?)\n([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/gm;
    let m;
    while ((m = simpleRegex.exec(clean)) !== null) {
      const total = parseEurNumber(m[6]);
      if (total > 0.50) {  // skip packaging
        lines.push({
          product: m[2].trim(),
          articleCode: '',
          qty: parseEurNumber(m[3]),
          unit: 'KG',
          unitPrice: parseEurNumber(m[5]),
          totalPrice: total,
        });
      }
    }
  }

  if (lines.length === 0) errors.push('No lines parsed');

  const totalMatch = clean.match(/Total HT\s*([\d\s,\.]+)/i);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'GMAPB',
    invoiceNumber,
    invoiceDate,
    customerRef: '',
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- ROLAND (La Table de Roland) ---
// Uses same filename every week (WDEEDITFAC.pdf)
// Need to look at the actual format

export function parseRoland(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/(?:Facture|FA)\s*(FA?\d+)/i);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const lines: InvoiceLine[] = [];
  // Generic line parser for French invoices
  const lineRegex = /([\d,]+)\s+(KG|PC|PI|U)\s+([\d,]+)\s+([\d,]+)\s*\n(.+?)(?=\n[\d,]|\nTotal|$)/gm;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    lines.push({
      product: match[5].trim().split('\n')[0],
      articleCode: '',
      qty: parseEurNumber(match[1]),
      unit: match[2] === 'KG' ? 'KG' : 'PC',
      unitPrice: parseEurNumber(match[3]),
      totalPrice: parseEurNumber(match[4]),
    });
  }

  if (lines.length === 0) errors.push('No lines parsed — Roland format varies');

  const totalMatch = clean.match(/Total.*?H\.?T\.?\s*:?\s*([\d\s,\.]+)/i);
  const totalHT = totalMatch ? parseEurNumber(totalMatch[1]) : 0;

  return {
    supplier: 'Roland',
    invoiceNumber,
    invoiceDate,
    customerRef: '',
    lines,
    totalHT,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- PARIS SAVEURS ---
// Similar format to GMAPB

export function parseParisSaveurs(text: string): ParsedInvoice {
  return parseGMAPB(text);  // Same Rungis market format
}

// --- REYNAUD ---

export function parseReynaud(text: string): ParsedInvoice {
  const clean = cleanText(text);
  const errors: string[] = [];

  const invMatch = clean.match(/Invoice\s*(\d+)/i);
  const invoiceNumber = invMatch ? invMatch[1] : '';

  const dateMatch = clean.match(/(\d{2}\/\d{2}\/\d{4})/);
  const invoiceDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : '';

  const lines: InvoiceLine[] = [];
  // Reynaud format: code product price unit
  const lineRegex = /(\d{5,6})\s+(.+?)\s+([\d,]+)\s+(KG|BAQ|PAN|PI)/gm;

  let match;
  while ((match = lineRegex.exec(clean)) !== null) {
    lines.push({
      product: match[2].trim(),
      articleCode: match[1],
      qty: 0,
      unit: match[4] === 'KG' ? 'KG' : 'PC',
      unitPrice: parseEurNumber(match[3]),
      totalPrice: 0,
    });
  }

  if (lines.length === 0) errors.push('No lines parsed');

  return {
    supplier: 'Reynaud',
    invoiceNumber,
    invoiceDate,
    customerRef: '',
    lines,
    totalHT: 0,
    currency: 'EUR',
    parseErrors: errors,
  };
}

// --- Dispatcher ---

export function parseInvoice(supplier: string, text: string): ParsedInvoice {
  const lower = supplier.toLowerCase();

  if (lower.includes('demarne')) return parseDemarne(text);
  if (lower.includes('delas')) return parseLeDelas(text);
  if (lower.includes('landaluz') || lower.includes('txogitxu') || lower.includes('bocarte') || lower.includes('jabu') || lower.includes('rafols') || lower.includes('incarlopsa')) return parseLandaluz(text);
  if (lower.includes('blanc')) return parseBlanc(text);
  if (lower.includes('desailly')) return parseDesailly(text);
  if (lower.includes('gmapb') || lower.includes('ishop') || lower.includes('plisson')) return parseGMAPB(text);
  if (lower.includes('roland') || lower.includes('latablederoland')) return parseRoland(text);
  if (lower.includes('paris saveur') || lower.includes('parissaveur')) return parseParisSaveurs(text);
  if (lower.includes('reynaud')) return parseReynaud(text);

  // Generic fallback
  return {
    supplier,
    invoiceNumber: '',
    invoiceDate: '',
    customerRef: '',
    lines: [],
    totalHT: 0,
    currency: 'EUR',
    parseErrors: [`No parser for supplier: ${supplier}`],
  };
}
