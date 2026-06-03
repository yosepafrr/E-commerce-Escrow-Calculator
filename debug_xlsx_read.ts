/**
 * Debug: Why does SheetJS only read 18 rows from income XLSX?
 * Python reads 405 rows from the same file!
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const income_path = 'D:\\Bisnis\\Web Automatic Business Calculator\\Data\\3juni\\income_20260603213436(UTC+7).xlsx';

const buffer = fs.readFileSync(income_path);
const workbook = XLSX.read(buffer, { type: 'buffer' });

console.log('=== WORKBOOK INFO ===');
console.log('Sheet names:', workbook.SheetNames);
console.log('Number of sheets:', workbook.SheetNames.length);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log(`\nSheet "${sheetName}":`);
  console.log(`  Range: ${sheet['!ref']}`);
  console.log(`  Rows: ${range.e.r - range.s.r + 1} (${range.s.r} to ${range.e.r})`);
  console.log(`  Cols: ${range.e.c - range.s.c + 1} (${range.s.c} to ${range.e.c})`);
  
  // Read data
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  console.log(`  JSON rows (with raw:false): ${jsonData.length}`);
  
  // Also try raw:true
  const jsonDataRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });
  console.log(`  JSON rows (with raw:true): ${jsonDataRaw.length}`);
  
  // Show first 3 rows
  if (jsonData.length > 0) {
    console.log(`  Headers: ${Object.keys(jsonData[0]).slice(0, 5)}`);
    console.log(`  First row:`, JSON.stringify(jsonData[0]).substring(0, 200));
    if (jsonData.length > 1) {
      console.log(`  Last row:`, JSON.stringify(jsonData[jsonData.length - 1]).substring(0, 200));
    }
  }
}

// Try without any options
console.log('\n=== READING WITH MINIMAL OPTIONS ===');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const allData = XLSX.utils.sheet_to_json(sheet);
console.log('Rows with default options:', allData.length);

// Check if there are merged cells or other issues
console.log('\n=== SHEET PROPERTIES ===');
console.log('Merges:', sheet['!merges']);
console.log('Ref:', sheet['!ref']);

// Check for multiple header rows or hidden rows
console.log('\n=== CHECKING INDIVIDUAL CELLS ===');
// Check cells in column A
for (let r = 0; r <= 25; r++) {
  const cellRef = `A${r + 1}`;
  const cell = sheet[cellRef];
  if (cell) {
    console.log(`  ${cellRef}: type=${cell.t} value=${JSON.stringify(cell.v).substring(0, 60)} w=${cell.w}`);
  } else {
    console.log(`  ${cellRef}: EMPTY/MISSING`);
  }
}

// Check the last few cells
const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
console.log(`\nLast few cells in column A:`);
for (let r = Math.max(0, range.e.r - 5); r <= range.e.r; r++) {
  const cellRef = `A${r + 1}`;
  const cell = sheet[cellRef];
  if (cell) {
    console.log(`  ${cellRef}: type=${cell.t} value=${JSON.stringify(cell.v).substring(0, 60)}`);
  } else {
    console.log(`  ${cellRef}: EMPTY/MISSING`);
  }
}
