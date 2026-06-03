import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedFile } from '@/types/file';
import { cleanHeader } from '@/utils/cleaning';

let fileIdCounter = 0;

function generateId(): string {
  return `file_${Date.now()}_${++fileIdCounter}`;
}

/**
 * Parse a single file (CSV, XLSX, XLS) and return structured data.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'csv') {
    return parseCsvFile(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelFile(file);
  }

  throw new Error(`Unsupported file format: .${ext}`);
}

/**
 * Parse CSV file using PapaParse.
 * TikTok order/affiliate CSVs may need special handling.
 */
async function parseCsvFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        const headers = (result.meta.fields || []).map(cleanHeader);
        const rows = (result.data as Record<string, string>[]).map(row => {
          const cleanedRow: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            cleanedRow[cleanHeader(key)] = String(value ?? '').trim();
          }
          return cleanedRow;
        });

        resolve({
          id: generateId(),
          name: file.name,
          size: file.size,
          headers,
          rows,
          rawFile: file,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parse error: ${error.message}`));
      },
    });
  });
}

/**
 * Parse Excel file using SheetJS.
 */
async function parseExcelFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Fix: Recalculate sheet range from actual cell addresses.
  // Some XLSX exports (e.g. TikTok income) write an incorrect <dimension> tag
  // that truncates the data. SheetJS trusts !ref, so we must correct it.
  const originalRef = sheet['!ref'] || 'A1';
  let maxRow = 0;
  let maxCol = 0;
  for (const cellRef of Object.keys(sheet)) {
    if (cellRef.startsWith('!')) continue;
    const decoded = XLSX.utils.decode_cell(cellRef);
    if (decoded.r > maxRow) maxRow = decoded.r;
    if (decoded.c > maxCol) maxCol = decoded.c;
  }
  const correctedRef = XLSX.utils.encode_range(
    { s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } }
  );
  if (correctedRef !== originalRef) {
    sheet['!ref'] = correctedRef;
  }

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  console.log(
    `[parseExcelFile] ${file.name}: original !ref=${originalRef}, corrected !ref=${correctedRef}, parsed rows=${jsonData.length}`
  );

  if (jsonData.length === 0) {
    return {
      id: generateId(),
      name: file.name,
      size: file.size,
      headers: [],
      rows: [],
      rawFile: file,
    };
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
    id: generateId(),
    name: file.name,
    size: file.size,
    headers,
    rows,
    rawFile: file,
  };
}

/**
 * Parse multiple files in parallel.
 */
export async function parseFiles(files: File[]): Promise<ParsedFile[]> {
  const results = await Promise.allSettled(files.map(parseFile));
  const parsed: ParsedFile[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      parsed.push(result.value);
    } else {
      console.error('Failed to parse file:', result.reason);
    }
  }

  return parsed;
}
