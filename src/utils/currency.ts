export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function parseRupiahToNumber(value: string): number {
  if (typeof value === 'number') return value;
  return parseFloat(
    String(value)
      .replace(/Rp\s*/gi, '')
      .replace(/\./g, '')
      .replace(/,/g, '')
      .trim()
  ) || 0;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('id-ID');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
