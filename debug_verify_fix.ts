/**
 * FINAL VERIFICATION: Complete pipeline with the !ref fix applied
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const DATA_DIR = 'D:\\Bisnis\\Web Automatic Business Calculator\\Data\\3juni';

function cleanHeader(header: string): string {
  return String(header).trim().replace(/\s+/g, ' ');
}

function normalizeId(x: unknown): string {
  let s = String(x).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  if (/[eE]\+/.test(s)) {
    try { s = BigInt(Math.round(parseFloat(s))).toString(); } catch { try { s = parseFloat(s).toFixed(0); } catch {} }
  }
  s = s.replace(/\t/g, '').trim();
  return s;
}

function parseCsvFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(content, { header: true, skipEmptyLines: true, dynamicTyping: false });
  const headers = (result.meta.fields || []).map(cleanHeader);
  const rows = (result.data as Record<string, string>[]).map(row => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) cleaned[cleanHeader(k)] = String(v ?? '').trim();
    return cleaned;
  });
  return { name: path.basename(filePath), headers, rows };
}

function parseExcelFileFixed(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // FIX: Recalculate !ref to include all actual cells
  let maxRow = 0, maxCol = 0;
  for (const cellRef of Object.keys(sheet)) {
    if (cellRef.startsWith('!')) continue;
    const decoded = XLSX.utils.decode_cell(cellRef);
    if (decoded.r > maxRow) maxRow = decoded.r;
    if (decoded.c > maxCol) maxCol = decoded.c;
  }
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]).map(cleanHeader) : [];
  const rows = jsonData.map(row => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) cleaned[cleanHeader(k)] = String(v ?? '').trim();
    return cleaned;
  });
  return { name: path.basename(filePath), headers, rows };
}

// Parse files
const orderFile1 = parseCsvFile(path.join(DATA_DIR, 'Dalam Pengiriman pesanan-2026-06-03-21_32.csv'));
const orderFile2 = parseCsvFile(path.join(DATA_DIR, 'Untuk Dikirim pesanan-2026-06-03-21_33.csv'));
const incomeFile = parseExcelFileFixed(path.join(DATA_DIR, 'income_20260603213436(UTC+7).xlsx'));

console.log(`Order rows: ${orderFile1.rows.length + orderFile2.rows.length}`);
console.log(`Income rows (FIXED): ${incomeFile.rows.length}`);

// Build sets
const findColumn = (headers: string[], aliases: string[]) => {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const a of aliases) { const i = lower.indexOf(a.toLowerCase().trim()); if (i >= 0) return headers[i]; }
  return null;
};

const orderIdCol = findColumn(orderFile1.headers, ['Order ID', 'ID Pesanan', 'OrderID']);
const incomeIdCol = findColumn(incomeFile.headers, ['ID Pesanan/Penyesuaian', 'Order/Adjustment ID', 'Order ID']);

const orderIds = new Set<string>();
for (const row of [...orderFile1.rows, ...orderFile2.rows]) {
  if (orderIdCol) { const id = normalizeId(row[orderIdCol]); if (id) orderIds.add(id); }
}

const incomeIds = new Set<string>();
for (const row of incomeFile.rows) {
  if (incomeIdCol) { const id = normalizeId(row[incomeIdCol]); if (id) incomeIds.add(id); }
}

console.log(`Unique order IDs: ${orderIds.size}`);
console.log(`Unique income IDs (FIXED): ${incomeIds.size}`);

// Match
let matchCount = 0;
for (const id of orderIds) {
  if (incomeIds.has(id)) matchCount++;
}

console.log(`\nMatched (should be removed): ${matchCount}`);
console.log(`Remaining: ${orderIds.size - matchCount}`);

console.log(matchCount === 35 ? '\n✓ MATCH! 35 orders correctly identified as paid.' : '\n✗ MISMATCH! Expected 35.');
