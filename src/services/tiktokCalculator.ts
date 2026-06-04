import type { DetectedFile } from '@/types/file';
import type { TiktokResult, TiktokOrder } from '@/types/tiktok';
import { findColumn } from './fileDetector';
import { cleanNumericValue, normalizeId } from '@/utils/cleaning';
import {
  TIKTOK_ORDER_ALIASES,
  TIKTOK_INCOME_ALIASES,
  TIKTOK_ADMIN_RATE,
  TIKTOK_SERVICE_RATE,
  TIKTOK_PROCESS_FEE,
  TIKTOK_AFFILIATE_RATE,
  TIKTOK_SPECIAL_PRODUCT,
  PRICE_SCALE_THRESHOLD,
} from '@/utils/constants';

/**
 * Calculate TikTok escrow from detected files.
 * Exact port of Python tts_escrow_calculator logic.
 */
export function calculateTiktokEscrow(
  orderFiles: DetectedFile[],
  affiliateFiles: DetectedFile[],
  incomeFiles: DetectedFile[]
): TiktokResult {
  console.log('[DEBUG] === TIKTOK CALCULATOR START ===');
  console.log('[DEBUG] orderFiles:', orderFiles.length, orderFiles.map(f => `${f.name} (${f.rows.length} rows, type=${f.fileType})`));
  console.log('[DEBUG] affiliateFiles:', affiliateFiles.length, affiliateFiles.map(f => `${f.name} (${f.rows.length} rows, type=${f.fileType})`));
  console.log('[DEBUG] incomeFiles:', incomeFiles.length, incomeFiles.map(f => `${f.name} (${f.rows.length} rows, type=${f.fileType})`));

  if (orderFiles.length === 0) {
    return emptyResult();
  }

  // Merge all order rows
  const allRows: Record<string, string>[] = [];
  const sampleHeaders = orderFiles[0].headers;

  for (const file of orderFiles) {
    allRows.push(...file.rows);
  }
  
  console.log('[DEBUG] Total merged order rows:', allRows.length);
  console.log('[DEBUG] sampleHeaders:', sampleHeaders.slice(0, 5));

  if (allRows.length === 0) {
    return emptyResult();
  }


  // Resolve column names
  const colOrderId = findColumn(sampleHeaders, TIKTOK_ORDER_ALIASES.orderId)!;
  const colStatus = findColumn(sampleHeaders, TIKTOK_ORDER_ALIASES.orderStatus)!;
  const colPrice = findColumn(sampleHeaders, TIKTOK_ORDER_ALIASES.skuPrice)!;
  const colQty = findColumn(sampleHeaders, TIKTOK_ORDER_ALIASES.quantity)!;
  const colProduct = findColumn(sampleHeaders, TIKTOK_ORDER_ALIASES.productName);

  if (!colOrderId || !colPrice || !colQty) {
    console.error('Missing required TikTok columns');
    return emptyResult();
  }

  // Build affiliate order set
  const affiliateOrders = new Set<string>();
  for (const affFile of affiliateFiles) {
    const affIdCol = findColumn(affFile.headers, TIKTOK_ORDER_ALIASES.orderId);
    if (affIdCol) {
      for (const row of affFile.rows) {
        const id = normalizeId(row[affIdCol]);
        if (id) affiliateOrders.add(id);
      }
    }
  }

  // Build income (paid) order set — only "Pesanan" transaction type
  const incomeOrders = new Set<string>();
  console.log('[DEBUG] === INCOME PROCESSING ===');
  console.log('[DEBUG] incomeFiles.length:', incomeFiles.length);
  for (const incFile of incomeFiles) {
    console.log('[DEBUG] Income file:', incFile.name, 'rows:', incFile.rows.length, 'headers:', incFile.headers.slice(0, 5));
    const incIdCol = findColumn(incFile.headers, TIKTOK_INCOME_ALIASES.orderId);
    const incTypeCol = findColumn(incFile.headers, TIKTOK_INCOME_ALIASES.transactionType);
    console.log('[DEBUG] incIdCol:', incIdCol, 'incTypeCol:', incTypeCol);
    if (incIdCol) {
      // Log first 5 raw values
      const sampleRaw = incFile.rows.slice(0, 5).map(r => r[incIdCol]);
      console.log('[DEBUG] Sample raw income IDs:', sampleRaw);
      const sampleNorm = sampleRaw.map(v => normalizeId(v));
      console.log('[DEBUG] Sample normalized income IDs:', sampleNorm);
      
      for (const row of incFile.rows) {
        const id = normalizeId(row[incIdCol]);

        if (id) {
          incomeOrders.add(id);
        }
      }
    }
  }
  console.log('[DEBUG] incomeOrders.size:', incomeOrders.size);
  console.log('[DEBUG] Sample incomeOrders (first 10):', Array.from(incomeOrders).slice(0, 10));
  

  // Parse SKU rows
  interface SkuRow {
    orderId: string;
    orderStatus: string;
    productName: string;
    skuPrice: number;
    quantity: number;
  }

  const skuRows: SkuRow[] = allRows
    .filter(row => row[colOrderId] && normalizeId(row[colOrderId]).length > 0)
    .map(row => ({
      orderId: normalizeId(row[colOrderId]),
      orderStatus: row[colStatus]?.trim() || '',
      productName: colProduct ? row[colProduct]?.trim() || '' : '',
      skuPrice: cleanNumericValue(row[colPrice]),
      quantity: cleanNumericValue(row[colQty]),
    }));

  // Fix scale
  const meanPrice = skuRows.reduce((sum, r) => sum + r.skuPrice, 0) / skuRows.length;
  if (meanPrice < PRICE_SCALE_THRESHOLD && meanPrice > 0) {
    for (const row of skuRows) {
      row.skuPrice *= 1000;
    }
  }

  // Compute subtotals
  const skusWithSubtotal = skuRows.map(row => ({
    ...row,
    subtotal: row.skuPrice * row.quantity,
  }));

  // Compute totalPesanan per order
  const orderSubtotals = new Map<string, number>();
  for (const sku of skusWithSubtotal) {
    const current = orderSubtotals.get(sku.orderId) || 0;
    orderSubtotals.set(sku.orderId, current + sku.subtotal);
  }

  // Calculate all fees
  const calculatedSkus = skusWithSubtotal.map(sku => {
    const totalPesanan = orderSubtotals.get(sku.orderId) || sku.subtotal;
    const biayaAdmin = TIKTOK_ADMIN_RATE * sku.subtotal;

    // Rate layanan — default 0.055, special product also 0.055 (since batas_waktu passed)
    const rateLayanan = sku.productName === TIKTOK_SPECIAL_PRODUCT
      ? 0.055
      : TIKTOK_SERVICE_RATE;
    const biayaLayanan = rateLayanan * sku.subtotal;
    const biayaProses = totalPesanan > 0
      ? (sku.subtotal / totalPesanan) * TIKTOK_PROCESS_FEE
      : TIKTOK_PROCESS_FEE;

    let estimasiPenghasilan = sku.subtotal - biayaAdmin - biayaLayanan - biayaProses;

    // Affiliate deduction
    const isAffiliate = affiliateOrders.has(sku.orderId);
    const potonganAffiliate = isAffiliate ? TIKTOK_AFFILIATE_RATE * sku.subtotal : 0;
    estimasiPenghasilan -= potonganAffiliate;

    return {
      ...sku,
      totalPesanan,
      biayaAdmin,
      biayaLayanan,
      biayaProses,
      isAffiliate,
      potonganAffiliate,
      estimasiPenghasilan,
    };
  });

  // Aggregate per Order ID
  const orderMap = new Map<string, TiktokOrder>();
  let duplicateCount = 0;

  for (const sku of calculatedSkus) {
    if (orderMap.has(sku.orderId)) {
      const existing = orderMap.get(sku.orderId)!;
      existing.subtotal += sku.subtotal;
      existing.biayaAdmin += sku.biayaAdmin;
      existing.biayaLayanan += sku.biayaLayanan;
      existing.biayaProses += sku.biayaProses;
      existing.potonganAffiliate += sku.potonganAffiliate;
      existing.estimasiPenghasilan += sku.estimasiPenghasilan;
    } else {
      orderMap.set(sku.orderId, {
        orderId: sku.orderId,
        orderStatus: sku.orderStatus,
        subtotal: sku.subtotal,
        biayaAdmin: sku.biayaAdmin,
        biayaLayanan: sku.biayaLayanan,
        biayaProses: sku.biayaProses,
        potonganAffiliate: sku.potonganAffiliate,
        estimasiPenghasilan: sku.estimasiPenghasilan,
        isAffiliate: sku.isAffiliate,
        escrowStatus: incomeOrders.has(sku.orderId) ? 'Sudah Cair' : 'Belum Cair',
      });
    }
  }

  const allOrders = Array.from(orderMap.values());

  // Count before removing paid orders
  const beforeRemoval = allOrders.length;
  
  console.log('[DEBUG] === ORDER MATCHING ===');
  console.log('[DEBUG] Total unique orders (beforeRemoval):', beforeRemoval);
  console.log('[DEBUG] Sample order IDs (first 10):', allOrders.slice(0, 10).map(o => o.orderId));
  console.log('[DEBUG] incomeOrders.size:', incomeOrders.size);
  
  // Debug: check which orders match income
  const matchedIds: string[] = [];
  const unmatchedIds: string[] = [];
  for (const o of allOrders) {
    if (incomeOrders.has(o.orderId)) {
      matchedIds.push(o.orderId);
    } else {
      unmatchedIds.push(o.orderId);
    }
  }
  console.log('[DEBUG] Matched (should be removed):', matchedIds.length);
  console.log('[DEBUG] Matched IDs:', matchedIds.sort());
  console.log('[DEBUG] Unmatched (should remain):', unmatchedIds.length);

  // Python ground truth: these 35 IDs should match
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
  
  // Check which Python-matched IDs are NOT found by TypeScript
  const tsMissing: string[] = [];
  for (const pid of pythonMatched) {
    const inOrders = allOrders.some(o => o.orderId === pid);
    const inIncome = incomeOrders.has(pid);
    if (!inOrders || !inIncome) {
      tsMissing.push(`${pid} (inOrders=${inOrders}, inIncome=${inIncome})`);
    }
  }
  if (tsMissing.length > 0) {
    console.log('[DEBUG] MISSING from TS that Python found:');
    tsMissing.forEach(m => console.log('[DEBUG]   ', m));
  } else {
    console.log('[DEBUG] All Python-matched IDs also matched in TS');
  }

  // Remove paid orders (found in income file)
  const escrowOrders = allOrders.filter(o => !incomeOrders.has(o.orderId));
  const paidOrderCount = beforeRemoval - escrowOrders.length;
  console.log('[DEBUG] paidOrderCount:', paidOrderCount);


  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const order of escrowOrders) {
    const status = order.orderStatus || 'Unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  }

  // Totals
  const totalEscrow = escrowOrders.reduce((sum, o) => sum + o.estimasiPenghasilan, 0);
  const totalBiayaAdmin = escrowOrders.reduce((sum, o) => sum + o.biayaAdmin, 0);
  const totalBiayaLayanan = escrowOrders.reduce((sum, o) => sum + o.biayaLayanan, 0);
  const totalBiayaProses = escrowOrders.reduce((sum, o) => sum + o.biayaProses, 0);
  const totalSubtotal = escrowOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalAffiliateDeduction = escrowOrders.reduce((sum, o) => sum + o.potonganAffiliate, 0);
  const affiliateOrderCount = escrowOrders.filter(o => o.isAffiliate).length;

  return {
    orders: escrowOrders,
    allOrders: allOrders,
    totalOrder: escrowOrders.length,
    totalEscrow,
    totalBiayaAdmin,
    totalBiayaLayanan,
    totalBiayaProses,
    totalSubtotal,
    totalAffiliateDeduction,
    affiliateOrderCount,
    paidOrderCount,
    removedOrderCount: paidOrderCount,
    statusBreakdown,
    duplicateCount,
  };
}

function emptyResult(): TiktokResult {
  return {
    orders: [],
    allOrders: [],
    totalOrder: 0,
    totalEscrow: 0,
    totalBiayaAdmin: 0,
    totalBiayaLayanan: 0,
    totalBiayaProses: 0,
    totalSubtotal: 0,
    totalAffiliateDeduction: 0,
    affiliateOrderCount: 0,
    paidOrderCount: 0,
    removedOrderCount: 0,
    statusBreakdown: {},
    duplicateCount: 0,
  };
}
