/**
 * Clean a cell value to a numeric float.
 * Handles "Rp" prefix, dot thousands separator, comma decimals.
 */
export function cleanNumericValue(x: unknown): number {
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

/**
 * Normalize an Order ID string.
 * Removes trailing ".0", handles scientific notation.
 */
export function normalizeId(x: unknown): string {
  let s = String(x).trim();
  
  // Remove trailing .0
  if (s.endsWith('.0')) {
    s = s.slice(0, -2);
  }
  
  // Handle scientific notation (e.g., 5.84e+17)
  if (/[eE]\+/.test(s)) {
    try {
      s = BigInt(Math.round(parseFloat(s))).toString();
    } catch {
      // If BigInt fails, use standard formatting
      try {
        s = parseFloat(s).toFixed(0);
      } catch {
        // keep as-is
      }
    }
  }
  
  // Remove leading/trailing whitespace and tab chars
  s = s.replace(/\t/g, '').trim();
  
  return s;
}

/**
 * Strip whitespace and special chars from column headers.
 */
export function cleanHeader(header: string): string {
  return String(header).trim().replace(/\s+/g, ' ');
}
