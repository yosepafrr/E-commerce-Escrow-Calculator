/**
 * CONFIRM: SheetJS reads only 19 rows because of incorrect !ref
 * FIX: Use sheetRows option or recalculate range
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const income_path = 'D:\\Bisnis\\Web Automatic Business Calculator\\Data\\3juni\\income_20260603213436(UTC+7).xlsx';

const buffer = fs.readFileSync(income_path);

// Test 1: Default read
const wb1 = XLSX.read(buffer, { type: 'buffer' });
const sheet1 = wb1.Sheets['Detail pesanan'];
console.log('Default !ref:', sheet1['!ref']);

const data1 = XLSX.utils.sheet_to_json(sheet1, { defval: '', raw: false });
console.log('Default rows:', data1.length);

// Test 2: Read with sheetRows option (no limit)
const wb2 = XLSX.read(buffer, { type: 'buffer' });
const sheet2 = wb2.Sheets['Detail pesanan'];

// Check if cells beyond row 19 actually exist
console.log('\nChecking cells beyond row 19:');
console.log('  A20:', sheet2['A20']);
console.log('  A21:', sheet2['A21']);
console.log('  A50:', sheet2['A50']);
console.log('  A100:', sheet2['A100']);
console.log('  A200:', sheet2['A200']);
console.log('  A400:', sheet2['A400']);
console.log('  A406:', sheet2['A406']);

// If the cells exist but !ref is wrong, we need to fix it
// Try recalculating the range
let maxRow = 0;
let maxCol = 0;
for (const cellRef of Object.keys(sheet2)) {
  if (cellRef.startsWith('!')) continue;
  const decoded = XLSX.utils.decode_cell(cellRef);
  if (decoded.r > maxRow) maxRow = decoded.r;
  if (decoded.c > maxCol) maxCol = decoded.c;
}
console.log(`\nActual data range: rows 0-${maxRow} (${maxRow + 1} total), cols 0-${maxCol}`);

// Fix the !ref
const correctRef = XLSX.utils.encode_range({
  s: { r: 0, c: 0 },
  e: { r: maxRow, c: maxCol }
});
console.log('Corrected !ref:', correctRef);

// Apply fix and re-read
sheet2['!ref'] = correctRef;
const data2 = XLSX.utils.sheet_to_json(sheet2, { defval: '', raw: false });
console.log('Fixed rows:', data2.length);

// Verify first and last rows
if (data2.length > 0) {
  const firstRow = data2[0] as Record<string, unknown>;
  const lastRow = data2[data2.length - 1] as Record<string, unknown>;
  console.log('\nFirst row ID:', firstRow['ID Pesanan/Penyesuaian']);
  console.log('Last row ID:', lastRow['ID Pesanan/Penyesuaian']);
}

// Now count unique IDs
const ids = new Set<string>();
for (const row of data2) {
  const r = row as Record<string, unknown>;
  const id = String(r['ID Pesanan/Penyesuaian'] ?? '').trim();
  if (id) ids.add(id);
}
console.log('Unique income IDs after fix:', ids.size);
