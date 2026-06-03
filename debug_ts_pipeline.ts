/**
 * Debug script: Simulates the EXACT TypeScript pipeline step by step
 * using the actual data files, to trace where the discrepancy occurs.
 * 
 * Run with: npx tsx debug_ts_pipeline.ts
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

const DATA_DIR = 'D:\\Bisnis\\Web Automatic Business Calculator\\Data\\3juni';

// ============================================
// REPLICATE: utils/cleaning.ts
// ============================================
function cleanHeader(header: string): string {
  return String(header).trim().replace(/\s+/g, ' ');
}

function normalizeId(x: unknown): string {
  let s = String(x).trim();
  if (s.endsWith('.0')) {
    s = s.slice(0, -2);
  }
  if (/[eE]\+/.test(s)) {
    try {
      s = BigInt(Math.round(parseFloat(s))).toString();
    } catch {
      try {
        s = parseFloat(s).toFixed(0);
      } catch {
        // keep as-is
      }
    }
  }
  s = s.replace(/\t/g, '').trim();
  return s;
}

function cleanNumericValue(x: unknown): number {
  if (typeof x === 'number') return x;
  if (x === null || x === undefined || x === '') return 0;
  const s = String(x).trim();
  const cleaned = s
    .replace(/Rp\s*/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ============================================
// REPLICATE: services/parser.ts
// ============================================
interface ParsedFile {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
}

function parseCsvFile(filePath: string): ParsedFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  
  const headers = (result.meta.fields || []).map(cleanHeader);
  const rows = (result.data as Record<string, string>[]).map(row => {
    const cleanedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      cleanedRow[cleanHeader(key)] = String(value ?? '').trim();
    }
    return cleanedRow;
  });

  return {
    name: path.basename(filePath),
    headers,
    rows,
  };
}

function parseExcelFile(filePath: string): ParsedFile {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (jsonData.length === 0) {
    return { name: path.basename(filePath), headers: [], rows: [] };
  }

  const headers = Object.keys(jsonData[0]).map(cleanHeader);
  const rows = jsonData.map(row => {
    const cleanedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      cleanedRow[cleanHeader(key)] = String(value ?? '').trim();
    }
    return cleanedRow;
  });

  return {
    name: path.basename(filePath),
    headers,
    rows,
  };
}

// ============================================
// REPLICATE: services/fileDetector.ts
// ============================================
const TIKTOK_ORDER_ALIASES: Record<string, string[]> = {
  orderId: ['Order ID', 'ID Pesanan', 'OrderID', 'order id'],
  orderStatus: ['Order Status', 'Status Pesanan', 'order status'],
  skuPrice: ['SKU Unit Original Price', 'Harga Satuan SKU', 'Original Price', 'sku unit original price'],
  quantity: ['Quantity', 'Jumlah', 'Qty', 'quantity'],
  productName: ['Product Name', 'Nama Produk', 'product name'],
};

const TIKTOK_INCOME_ALIASES: Record<string, string[]> = {
  orderId: ['ID Pesanan/Penyesuaian', 'Order/Adjustment ID', 'Order ID', 'id pesanan/penyesuaian'],
  transactionType: ['Jenis transaksi', 'Transaction Type', 'jenis transaksi'],
  settlementAmount: ['Jumlah penyelesaian pembayaran', 'Settlement Amount', 'jumlah penyelesaian pembayaran'],
};

function findColumn(headers: string[], aliases: string[]): string | null {
  const headerLower = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = headerLower.indexOf(alias.toLowerCase().trim());
    if (idx >= 0) return headers[idx];
  }
  return null;
}

// ============================================
// MAIN DEBUG
// ============================================

console.log('='.repeat(80));
console.log('STEP 1: Parse files (simulating TypeScript parser)');
console.log('='.repeat(80));

// Order files (larger = order, smaller = affiliate)
const orderFile1 = parseCsvFile(path.join(DATA_DIR, 'Dalam Pengiriman pesanan-2026-06-03-21_32.csv'));
const affiliateFile1 = parseCsvFile(path.join(DATA_DIR, 'Dalam Pengiriman pesanan-2026-06-03-21_33.csv'));
const orderFile2 = parseCsvFile(path.join(DATA_DIR, 'Untuk Dikirim pesanan-2026-06-03-21_33.csv'));
const affiliateFile2 = parseCsvFile(path.join(DATA_DIR, 'Untuk Dikirim pesanan-2026-06-03-21_34.csv'));
const incomeFile = parseExcelFile(path.join(DATA_DIR, 'income_20260603213436(UTC+7).xlsx'));

console.log(`Order file 1: ${orderFile1.name}, ${orderFile1.rows.length} rows, headers: ${orderFile1.headers.slice(0, 3)}`);
console.log(`Affiliate file 1: ${affiliateFile1.name}, ${affiliateFile1.rows.length} rows`);
console.log(`Order file 2: ${orderFile2.name}, ${orderFile2.rows.length} rows`);
console.log(`Affiliate file 2: ${affiliateFile2.name}, ${affiliateFile2.rows.length} rows`);
console.log(`Income file: ${incomeFile.name}, ${incomeFile.rows.length} rows, headers: ${incomeFile.headers.slice(0, 3)}`);

console.log('\n' + '='.repeat(80));
console.log('STEP 2: Check Order ID samples');
console.log('='.repeat(80));

const orderIdCol = findColumn(orderFile1.headers, TIKTOK_ORDER_ALIASES.orderId);
console.log(`Order ID column: "${orderIdCol}"`);

if (orderIdCol) {
  console.log('Raw Order IDs (first 5):');
  for (let i = 0; i < 5 && i < orderFile1.rows.length; i++) {
    const raw = orderFile1.rows[i][orderIdCol];
    const normalized = normalizeId(raw);
    console.log(`  [${i}] raw="${raw}" (len=${raw.length}) -> normalized="${normalized}" (len=${normalized.length})`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('STEP 3: Check Income ID samples');
console.log('='.repeat(80));

const incomeIdCol = findColumn(incomeFile.headers, TIKTOK_INCOME_ALIASES.orderId);
console.log(`Income ID column: "${incomeIdCol}"`);

if (incomeIdCol) {
  console.log('Raw Income IDs (first 10):');
  for (let i = 0; i < 10 && i < incomeFile.rows.length; i++) {
    const raw = incomeFile.rows[i][incomeIdCol];
    const normalized = normalizeId(raw);
    console.log(`  [${i}] raw="${raw}" (len=${raw.length}) -> normalized="${normalized}" (len=${normalized.length})`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('STEP 4: Build order set and income set');
console.log('='.repeat(80));

// Merge order files
const allOrderRows = [...orderFile1.rows, ...orderFile2.rows];
console.log(`Total order rows: ${allOrderRows.length}`);

// Build unique order IDs
const orderIdSet = new Set<string>();
if (orderIdCol) {
  for (const row of allOrderRows) {
    const id = normalizeId(row[orderIdCol]);
    if (id) orderIdSet.add(id);
  }
}
console.log(`Unique order IDs: ${orderIdSet.size}`);

// Build income set
const incomeOrderSet = new Set<string>();
if (incomeIdCol) {
  for (const row of incomeFile.rows) {
    const id = normalizeId(row[incomeIdCol]);
    if (id) incomeOrderSet.add(id);
  }
}
console.log(`Income order set size: ${incomeOrderSet.size}`);

console.log('\n' + '='.repeat(80));
console.log('STEP 5: Match orders against income');
console.log('='.repeat(80));

const matched: string[] = [];
const unmatched: string[] = [];

for (const id of orderIdSet) {
  if (incomeOrderSet.has(id)) {
    matched.push(id);
  } else {
    unmatched.push(id);
  }
}

console.log(`Matched (should be removed): ${matched.length}`);
console.log(`Unmatched (should remain): ${unmatched.length}`);

if (matched.length !== 35) {
  console.log('\n*** DISCREPANCY DETECTED! Expected 35 matched, got', matched.length);
  
  // Python ground truth
  const pythonMatched = [
    '584021074403755732', '584058793290991084', '584068242282874071',
    '584075599618016326', '584089935647311626', '584099081492596055',
    '584131390011115082', '584142681202918935', '584155440616474483',
    '584157074024203736', '584157811649054227', '584160020748010565',
    '584161333475574800', '584164583565461287', '584164698792756653',
    '584168109663421873', '584171071063098601', '584179612776367886',
    '584180667650246054', '584180667673118558', '584180956208465395',
    '584181672584578752', '584182489133647177', '584185444207527435',
    '584186544726050679', '584187376161162836', '584190403819766876',
    '584194767417345070', '584196008937293172', '584197782527968381',
    '584198078030579314', '584198710013495285', '584201512428668372',
    '584219134493296517', '584236855502800517',
  ];
  
  console.log('\nPython matched IDs NOT found by TypeScript:');
  for (const pid of pythonMatched) {
    const inOrders = orderIdSet.has(pid);
    const inIncome = incomeOrderSet.has(pid);
    if (!inOrders || !inIncome) {
      console.log(`  ${pid} (inOrders=${inOrders}, inIncome=${inIncome})`);
    }
  }
  
  // Check: are the missing ones just not in the income set?
  console.log('\nTS-only matched IDs (NOT in Python matched):');
  const pySet = new Set(pythonMatched);
  for (const id of matched) {
    if (!pySet.has(id)) {
      console.log(`  ${id}`);
    }
  }
}

console.log('\nMatched IDs:');
matched.sort().forEach(id => console.log(`  ${id}`));
