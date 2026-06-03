import type { ParsedFile, DetectedFile, FileType, DetectionDetail, Marketplace } from '@/types/file';
import { normalizeId } from '@/utils/cleaning';
import {
  SHOPEE_COLUMN_ALIASES,
  TIKTOK_ORDER_ALIASES,
  TIKTOK_INCOME_ALIASES,
  SUBSET_VALIDATION_THRESHOLD,
} from '@/utils/constants';

// ==========================================
// COLUMN ALIAS MATCHING
// ==========================================

/**
 * Find the actual column name in headers that matches any alias.
 */
export function findColumn(headers: string[], aliases: string[]): string | null {
  const headerLower = headers.map(h => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = headerLower.indexOf(alias.toLowerCase().trim());
    if (idx >= 0) return headers[idx];
  }
  return null;
}

/**
 * Check if a set of required alias groups are all found in headers.
 */
function matchesAliases(
  headers: string[],
  aliasGroups: Record<string, string[]>,
  requiredKeys: string[]
): { matched: boolean; matchCount: number; totalRequired: number } {
  let matchCount = 0;
  for (const key of requiredKeys) {
    const aliases = aliasGroups[key];
    if (aliases && findColumn(headers, aliases)) {
      matchCount++;
    }
  }
  return {
    matched: matchCount === requiredKeys.length,
    matchCount,
    totalRequired: requiredKeys.length,
  };
}

// ==========================================
// LAYER 1: HEADER ANALYSIS
// ==========================================

function detectByHeaders(file: ParsedFile): { type: FileType; score: number; reason: string } {
  const headers = file.headers;

  // Shopee detection
  const shopeeMatch = matchesAliases(headers, SHOPEE_COLUMN_ALIASES, [
    'orderNumber', 'orderStatus', 'productName', 'priceAfterDiscount',
  ]);
  if (shopeeMatch.matched) {
    return { type: 'shopee_order', score: 40, reason: `Matched ${shopeeMatch.matchCount}/${shopeeMatch.totalRequired} Shopee columns` };
  }

  // TikTok Income detection
  const incomeMatch = matchesAliases(headers, TIKTOK_INCOME_ALIASES, [
    'orderId', 'transactionType', 'settlementAmount',
  ]);
  if (incomeMatch.matched) {
    return { type: 'tiktok_income', score: 40, reason: `Matched ${incomeMatch.matchCount}/${incomeMatch.totalRequired} TikTok Income columns` };
  }

  // TikTok Order/Affiliate detection (same headers)
  const tiktokMatch = matchesAliases(headers, TIKTOK_ORDER_ALIASES, [
    'orderId', 'orderStatus', 'skuPrice', 'quantity',
  ]);
  if (tiktokMatch.matched) {
    // Initially mark as tiktok_order; will refine later
    return { type: 'tiktok_order', score: 30, reason: `Matched ${tiktokMatch.matchCount}/${tiktokMatch.totalRequired} TikTok Order columns` };
  }

  // Partial matches
  if (shopeeMatch.matchCount >= 2) {
    return { type: 'shopee_order', score: 15, reason: `Partial Shopee match: ${shopeeMatch.matchCount}/${shopeeMatch.totalRequired}` };
  }
  if (tiktokMatch.matchCount >= 2) {
    return { type: 'tiktok_order', score: 15, reason: `Partial TikTok match: ${tiktokMatch.matchCount}/${tiktokMatch.totalRequired}` };
  }

  return { type: 'unknown', score: 0, reason: 'No column pattern matched' };
}

// ==========================================
// LAYER 3: FILENAME ANALYSIS
// ==========================================

function detectByFilename(file: ParsedFile): { type: FileType | null; score: number; reason: string } {
  const name = file.name.toLowerCase();

  if (name.includes('income') || name.includes('penghasilan')) {
    return { type: 'tiktok_income', score: 15, reason: 'Filename contains "income"' };
  }
  if (name.includes('order') && (name.includes('shipping') || name.includes('toship') || name.includes('to ship'))) {
    return { type: 'shopee_order', score: 10, reason: 'Filename matches Shopee order pattern' };
  }
  if (name.includes('pesanan') || name.includes('pengiriman') || name.includes('dikirim')) {
    return { type: 'tiktok_order', score: 10, reason: 'Filename contains TikTok order keywords' };
  }

  return { type: null, score: 0, reason: 'No filename pattern matched' };
}

// ==========================================
// EXTRACT BASE NAME FOR GROUPING
// ==========================================

function getBaseName(filename: string): string {
  // Remove timestamp and extension
  // "Dalam Pengiriman pesanan-2026-06-01-16_51.csv" -> "Dalam Pengiriman pesanan"
  return filename
    .replace(/\.\w+$/, '') // remove extension
    .replace(/-?\d{4}-\d{2}-\d{2}.*$/, '') // remove date + everything after
    .trim();
}

function extractTimestamp(filename: string): number {
  // Extract time like "16_51" from "Dalam Pengiriman pesanan-2026-06-01-16_51.csv"
  const match = filename.match(/(\d{2})[_:](\d{2})/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

// ==========================================
// DETECT ALL FILES
// ==========================================

export function detectFiles(parsedFiles: ParsedFile[]): DetectedFile[] {
  // Step 1: Initial detection per file
  const detectedFiles: DetectedFile[] = parsedFiles.map(file => {
    const details: DetectionDetail[] = [];
    let totalScore = 0;
    let detectedType: FileType = 'unknown';

    // Layer 1: Header analysis
    const headerResult = detectByHeaders(file);
    details.push({
      layer: 'Header Analysis',
      matched: headerResult.type !== 'unknown',
      score: headerResult.score,
      reason: headerResult.reason,
    });
    totalScore += headerResult.score;
    if (headerResult.type !== 'unknown') {
      detectedType = headerResult.type;
    }

    // Layer 3: Filename analysis
    const filenameResult = detectByFilename(file);
    details.push({
      layer: 'Filename Analysis',
      matched: filenameResult.type !== null,
      score: filenameResult.score,
      reason: filenameResult.reason,
    });
    if (filenameResult.type && (detectedType === 'unknown' || filenameResult.type === detectedType)) {
      totalScore += filenameResult.score;
      if (detectedType === 'unknown') {
        detectedType = filenameResult.type;
      }
    }

    const marketplace: Marketplace | null =
      detectedType === 'shopee_order' ? 'shopee' :
      detectedType.startsWith('tiktok') ? 'tiktok' : null;

    return {
      ...file,
      fileType: detectedType,
      marketplace,
      confidence: Math.min(totalScore, 100),
      detectionDetails: details,
    };
  });

  // Step 2: TikTok Order vs Affiliate differentiation
  differentiateOrderAffiliate(detectedFiles);

  return detectedFiles;
}

// ==========================================
// LAYER 2, 4, 5: ORDER vs AFFILIATE
// ==========================================

function differentiateOrderAffiliate(files: DetectedFile[]): void {
  // Find all files detected as tiktok_order
  const tiktokOrderFiles = files.filter(f => f.fileType === 'tiktok_order');

  if (tiktokOrderFiles.length < 2) return; // Need at least 2 to differentiate

  // Group by base name
  const groups = new Map<string, DetectedFile[]>();
  for (const file of tiktokOrderFiles) {
    const base = getBaseName(file.name);
    if (!groups.has(base)) {
      groups.set(base, []);
    }
    groups.get(base)!.push(file);
  }

  // Process each group
  for (const [, groupFiles] of groups) {
    if (groupFiles.length !== 2) continue;

    const [fileA, fileB] = groupFiles;
    const rowCountA = fileA.rows.length;
    const rowCountB = fileB.rows.length;

    let orderFile: DetectedFile;
    let affiliateFile: DetectedFile;
    let reason: string;

    // Rule 1: Row count analysis
    if (Math.abs(rowCountA - rowCountB) > 2) {
      if (rowCountA > rowCountB) {
        orderFile = fileA;
        affiliateFile = fileB;
      } else {
        orderFile = fileB;
        affiliateFile = fileA;
      }
      reason = `Row count: Order=${Math.max(rowCountA, rowCountB)}, Affiliate=${Math.min(rowCountA, rowCountB)}`;
    } else {
      // Rule 2: Timestamp analysis
      const tsA = extractTimestamp(fileA.name);
      const tsB = extractTimestamp(fileB.name);

      if (tsA < tsB) {
        orderFile = fileA;
        affiliateFile = fileB;
      } else {
        orderFile = fileB;
        affiliateFile = fileA;
      }
      reason = `Timestamp: earlier file = Order, later = Affiliate`;
    }

    // Apply classification
    affiliateFile.fileType = 'tiktok_affiliate';
    affiliateFile.detectionDetails.push({
      layer: 'Order/Affiliate Differentiation',
      matched: true,
      score: 20,
      reason,
    });
    affiliateFile.confidence = Math.min(affiliateFile.confidence + 20, 100);

    orderFile.detectionDetails.push({
      layer: 'Order/Affiliate Differentiation',
      matched: true,
      score: 20,
      reason,
    });
    orderFile.confidence = Math.min(orderFile.confidence + 20, 100);

    // Rule 3: Subset validation
    const orderIdCol = findColumn(affiliateFile.headers, TIKTOK_ORDER_ALIASES.orderId);
    if (orderIdCol) {
      const affiliateIds = new Set(
        affiliateFile.rows.map(r => normalizeId(r[orderIdCol]))
      );
      const orderIdColMain = findColumn(orderFile.headers, TIKTOK_ORDER_ALIASES.orderId);
      if (orderIdColMain) {
        const orderIds = new Set(
          orderFile.rows.map(r => normalizeId(r[orderIdColMain]))
        );
        let matchCount = 0;
        for (const id of affiliateIds) {
          if (orderIds.has(id)) matchCount++;
        }
        const overlapRatio = affiliateIds.size > 0 ? matchCount / affiliateIds.size : 0;

        const subsetPassed = overlapRatio >= SUBSET_VALIDATION_THRESHOLD;
        const subsetScore = subsetPassed ? 25 : 0;

        affiliateFile.detectionDetails.push({
          layer: 'Subset Validation',
          matched: subsetPassed,
          score: subsetScore,
          reason: `${(overlapRatio * 100).toFixed(0)}% of affiliate IDs found in order file (threshold: ${SUBSET_VALIDATION_THRESHOLD * 100}%)`,
        });
        affiliateFile.confidence = Math.min(affiliateFile.confidence + subsetScore, 100);

        orderFile.detectionDetails.push({
          layer: 'Subset Validation',
          matched: subsetPassed,
          score: subsetScore,
          reason: `${(overlapRatio * 100).toFixed(0)}% overlap confirmed`,
        });
        orderFile.confidence = Math.min(orderFile.confidence + subsetScore, 100);
      }
    }
  }

  // Handle remaining ungrouped tiktok_order files
  // If we have pairs already differentiated, any unpaired tiktok_order files stay as order
}
