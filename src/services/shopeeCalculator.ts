import type { DetectedFile } from '@/types/file';
import type { ShopeeResult, ShopeeOrder } from '@/types/shopee';
import { findColumn } from './fileDetector';
import { cleanNumericValue } from '@/utils/cleaning';
import {
  SHOPEE_COLUMN_ALIASES,
  SHOPEE_ADMIN_RATE,
  SHOPEE_SERVICE_RATE_DEFAULT,
  SHOPEE_SERVICE_RATE_SPECIAL,
  SHOPEE_PROCESS_FEE,
  SHOPEE_SPECIAL_PRODUCT,
  PRICE_SCALE_THRESHOLD,
} from '@/utils/constants';

/**
 * Calculate Shopee escrow from detected order files.
 * Exact port of Python shopee_escrow_calculator logic.
 */
export function calculateShopeeEscrow(orderFiles: DetectedFile[]): ShopeeResult {
  if (orderFiles.length === 0) {
    return emptyResult();
  }

  // Merge all rows from all Shopee order files
  const allRows: Record<string, string>[] = [];
  const sampleHeaders = orderFiles[0].headers;

  for (const file of orderFiles) {
    allRows.push(...file.rows);
  }

  if (allRows.length === 0) {
    return emptyResult();
  }

  // Resolve column names using aliases
  const colOrder = findColumn(sampleHeaders, SHOPEE_COLUMN_ALIASES.orderNumber)!;
  const colStatus = findColumn(sampleHeaders, SHOPEE_COLUMN_ALIASES.orderStatus)!;
  const colProduct = findColumn(sampleHeaders, SHOPEE_COLUMN_ALIASES.productName)!;
  const colPrice = findColumn(sampleHeaders, SHOPEE_COLUMN_ALIASES.priceAfterDiscount)!;
  const colQty = findColumn(sampleHeaders, SHOPEE_COLUMN_ALIASES.quantity)!;

  if (!colOrder || !colPrice || !colQty) {
    console.error('Missing required Shopee columns');
    return emptyResult();
  }

  // Clean numeric values
  interface SkuRow {
    noPesanan: string;
    statusPesanan: string;
    namaProduk: string;
    hargaSetelahDiskon: number;
    jumlah: number;
  }

  const skuRows: SkuRow[] = allRows
    .filter(row => row[colOrder] && row[colOrder].trim())
    .map(row => ({
      noPesanan: row[colOrder]?.trim() || '',
      statusPesanan: row[colStatus]?.trim() || '',
      namaProduk: row[colProduct]?.trim() || '',
      hargaSetelahDiskon: cleanNumericValue(row[colPrice]),
      jumlah: cleanNumericValue(row[colQty]),
    }));

  // Fix scale: if mean price < 1000, multiply by 1000
  const meanPrice = skuRows.reduce((sum, r) => sum + r.hargaSetelahDiskon, 0) / skuRows.length;
  if (meanPrice < PRICE_SCALE_THRESHOLD && meanPrice > 0) {
    for (const row of skuRows) {
      row.hargaSetelahDiskon *= 1000;
    }
  }

  // Calculate subtotal per SKU
  interface CalculatedSku extends SkuRow {
    subtotal: number;
    totalPesanan: number;
    biayaAdmin: number;
    rateLayanan: number;
    biayaLayanan: number;
    biayaProses: number;
    estimasiPenghasilan: number;
  }

  // First pass: compute subtotal
  const skusWithSubtotal = skuRows.map(row => ({
    ...row,
    subtotal: row.hargaSetelahDiskon * row.jumlah,
  }));

  // Compute totalPesanan per order
  const orderSubtotals = new Map<string, number>();
  for (const sku of skusWithSubtotal) {
    const current = orderSubtotals.get(sku.noPesanan) || 0;
    orderSubtotals.set(sku.noPesanan, current + sku.subtotal);
  }

  // Second pass: compute all fees
  const calculatedSkus: CalculatedSku[] = skusWithSubtotal.map(sku => {
    const totalPesanan = orderSubtotals.get(sku.noPesanan) || sku.subtotal;
    const biayaAdmin = SHOPEE_ADMIN_RATE * sku.subtotal;
    const rateLayanan = sku.namaProduk === SHOPEE_SPECIAL_PRODUCT
      ? SHOPEE_SERVICE_RATE_SPECIAL
      : SHOPEE_SERVICE_RATE_DEFAULT;
    const biayaLayanan = rateLayanan * sku.subtotal;
    const biayaProses = totalPesanan > 0
      ? (sku.subtotal / totalPesanan) * SHOPEE_PROCESS_FEE
      : SHOPEE_PROCESS_FEE;
    const estimasiPenghasilan = sku.subtotal - biayaAdmin - biayaLayanan - biayaProses;

    return {
      ...sku,
      totalPesanan,
      biayaAdmin,
      rateLayanan,
      biayaLayanan,
      biayaProses,
      estimasiPenghasilan,
    };
  });

  // Aggregate per order
  const orderMap = new Map<string, ShopeeOrder>();
  let duplicateCount = 0;

  for (const sku of calculatedSkus) {
    if (orderMap.has(sku.noPesanan)) {
      const existing = orderMap.get(sku.noPesanan)!;
      existing.subtotal += sku.subtotal;
      existing.biayaAdmin += sku.biayaAdmin;
      existing.biayaLayanan += sku.biayaLayanan;
      existing.biayaProses += sku.biayaProses;
      existing.estimasiPenghasilan += sku.estimasiPenghasilan;
    } else {
      orderMap.set(sku.noPesanan, {
        noPesanan: sku.noPesanan,
        statusPesanan: sku.statusPesanan,
        namaProduk: sku.namaProduk,
        subtotal: sku.subtotal,
        biayaAdmin: sku.biayaAdmin,
        biayaLayanan: sku.biayaLayanan,
        biayaProses: sku.biayaProses,
        estimasiPenghasilan: sku.estimasiPenghasilan,
        escrowStatus: 'Belum Cair',
      });
    }
  }

  // Deduplicate (already handled by Map, but count pre-dedup)
  const uniqueOrders = Array.from(orderMap.values());
  const seenIds = new Set<string>();
  const dedupedOrders: ShopeeOrder[] = [];

  for (const order of uniqueOrders) {
    if (seenIds.has(order.noPesanan)) {
      duplicateCount++;
    } else {
      seenIds.add(order.noPesanan);
      dedupedOrders.push(order);
    }
  }

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const order of dedupedOrders) {
    const status = order.statusPesanan || 'Unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  }

  // Totals
  const totalEscrow = dedupedOrders.reduce((sum, o) => sum + o.estimasiPenghasilan, 0);
  const totalBiayaAdmin = dedupedOrders.reduce((sum, o) => sum + o.biayaAdmin, 0);
  const totalBiayaLayanan = dedupedOrders.reduce((sum, o) => sum + o.biayaLayanan, 0);
  const totalBiayaProses = dedupedOrders.reduce((sum, o) => sum + o.biayaProses, 0);
  const totalSubtotal = dedupedOrders.reduce((sum, o) => sum + o.subtotal, 0);

  return {
    orders: dedupedOrders,
    allOrders: dedupedOrders,
    totalOrder: dedupedOrders.length,
    totalEscrow,
    totalBiayaAdmin,
    totalBiayaLayanan,
    totalBiayaProses,
    totalSubtotal,
    statusBreakdown,
    duplicateCount,
  };
}

function emptyResult(): ShopeeResult {
  return {
    orders: [],
    allOrders: [],
    totalOrder: 0,
    totalEscrow: 0,
    totalBiayaAdmin: 0,
    totalBiayaLayanan: 0,
    totalBiayaProses: 0,
    totalSubtotal: 0,
    statusBreakdown: {},
    duplicateCount: 0,
  };
}
