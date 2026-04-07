import type { RecapSupplier } from './types';

export function generateFranceRecap(date: string, suppliers: RecapSupplier[]): string {
  const dt = new Date(date + 'T00:00:00');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateDisplay = `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;

  const included = suppliers.filter(s => s.included);
  const hasBoxA = included.some(s => s.box === 'A');

  const lines: string[] = [];
  lines.push(`Subject: FDX SUPPLIER RECAP for Shipment for ${dateDisplay}`);
  lines.push('');
  lines.push('Dear all,');
  lines.push('');
  lines.push('Please find below the list of suppliers for this week\'s shipment. Kindly notify');
  lines.push('us if you have not received the order of any of the suppliers as listed');
  lines.push('below before closing the shipment.');
  lines.push('');

  if (hasBoxA) {
    lines.push('REMARK: For Demarne, please separate seafood in to 2 different Boxes.');
    lines.push('');
    lines.push('Box A: include Demarne Box A, Cap Horn, Lambert, PSK, Oyster Gillardeau from Roland)');
    lines.push('');
    lines.push('Box B: Demarne Box B and all other seafood supplier not listed above');
    lines.push('');
  }

  lines.push('SUPPLIERS List:');
  lines.push('');
  for (const s of included) {
    let line = s.name;
    if (s.box === 'A') line += ' - Box A';
    if (s.box === 'Frozen') line += ' - Frozen';
    if (s.notes) line += ` (${s.notes})`;
    lines.push(line);
  }
  lines.push('');
  lines.push('');
  lines.push('CONSIGNEE\'S Name & address');
  lines.push('FDX Co.,Ltd');
  lines.push('20/52 Soi Sukhumvit 36 , Klongton,');
  lines.push('Klongtoey, Bangkok , 10110');
  lines.push('TAX ID - 0105561099719');
  lines.push('CTC MS KUNALAI TEL: +662 012 6921');
  lines.push('');
  lines.push('');
  lines.push('HANDLING INFORMATION:');
  lines.push('POUCH ATTACHED –');
  lines.push('DO NOT INCLUDE ANY INVOICES TOGETHER WITH THE SHIPMENT!!');
  lines.push('');
  lines.push('');
  lines.push('NATURE & QUANTITY OF GOODS');
  lines.push('VIVRES FRAIS VERY PERISHABLE FOOD');
  lines.push('KEEP REFRIGERATED AT +2 +4 DEGREE CELSIUS AT ALL TIMES');
  lines.push('');
  lines.push('Many thanks.');
  lines.push('');
  lines.push('Kind regards,');
  lines.push('Cindy');

  return lines.join('\n');
}

export function generateItalyRecap(date: string, suppliers: RecapSupplier[]): string {
  const dt = new Date(date + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateDisplay = `${String(dt.getDate()).padStart(2,'0')} ${months[dt.getMonth()]}, ${dt.getFullYear()}`;

  const included = suppliers.filter(s => s.included);

  const lines: string[] = [];
  lines.push(`Subject: FDX SUPPLIER RECAP for Italy Shipment for ${dateDisplay}`);
  lines.push('');
  lines.push('Dear Cristian,');
  lines.push('');
  lines.push('Please find below the list of suppliers for this week\'s shipment.');
  lines.push('Kindly notify us if you have not received the order of any of the suppliers');
  lines.push('as listed below before closing the shipment.');
  lines.push('');
  lines.push('');
  lines.push('SUPPLIERS List:');
  lines.push('');
  lines.push(`Deliver to New Special on ${dateDisplay}`);
  lines.push('');
  for (const s of included) {
    let line = s.name;
    if (s.notes) line += ` (${s.notes})`;
    lines.push(line);
  }
  lines.push('');
  lines.push('');
  lines.push('CONSIGNEE\'S Name & address');
  lines.push('FDX Co.,Ltd');
  lines.push('20/52 Soi Sukhumvit 36 , Klongton,');
  lines.push('Klongtoey, Bangkok , 10110');
  lines.push('TAX ID - 0105561099719');
  lines.push('CTC MS KUNALAI TEL: +662 012 6921');
  lines.push('');
  lines.push('');
  lines.push('HANDLING INFORMATION:');
  lines.push('POUCH ATTACHED –');
  lines.push('DO NOT INCLUDE ANY INVOICES TOGETHER WITH THE SHIPMENT!!');
  lines.push('');
  lines.push('');
  lines.push('NATURE & QUANTITY OF GOODS');
  lines.push('VERY PERISHABLE FOOD');
  lines.push('KEEP REFRIGERATED AT +2 +8 DEGREE CELSIUS AT ALL TIMES');
  lines.push('');
  lines.push('');
  lines.push('Best regards,');
  lines.push('Phueng');

  return lines.join('\n');
}
