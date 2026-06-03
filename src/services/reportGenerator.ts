import type { DetectedFile } from '@/types/file';
import type { CalculationResult, ValidationWarning, ProgressStep, ProgressCallback } from '@/types/report';
import { parseFiles } from './parser';
import { detectFiles } from './fileDetector';
import { calculateShopeeEscrow } from './shopeeCalculator';
import { calculateTiktokEscrow } from './tiktokCalculator';
import { LOW_CONFIDENCE_THRESHOLD } from '@/utils/constants';

function createSteps(): ProgressStep[] {
  return [
    { id: 'parsing', label: 'progress.parsing', status: 'pending' },
    { id: 'detecting', label: 'progress.detecting', status: 'pending' },
    { id: 'detectingAffiliate', label: 'progress.detectingAffiliate', status: 'pending' },
    { id: 'validating', label: 'progress.validating', status: 'pending' },
    { id: 'calculatingShopee', label: 'progress.calculatingShopee', status: 'pending' },
    { id: 'calculatingTiktok', label: 'progress.calculatingTiktok', status: 'pending' },
    { id: 'generating', label: 'progress.generating', status: 'pending' },
    { id: 'completed', label: 'progress.completed', status: 'pending' },
  ];
}

function updateStep(
  steps: ProgressStep[],
  id: string,
  status: ProgressStep['status'],
  onProgress?: ProgressCallback
): void {
  const step = steps.find(s => s.id === id);
  if (step) {
    step.status = status;
    onProgress?.([...steps]);
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run the full calculation pipeline.
 */
export async function generateReport(
  files: File[],
  onProgress?: ProgressCallback
): Promise<CalculationResult> {
  const steps = createSteps();
  onProgress?.(steps);

  // Step 1: Parse files
  updateStep(steps, 'parsing', 'running', onProgress);
  await delay(200);
  const parsedFiles = await parseFiles(files);
  updateStep(steps, 'parsing', 'completed', onProgress);

  // Step 2: Detect marketplace
  updateStep(steps, 'detecting', 'running', onProgress);
  await delay(200);
  const detectedFiles = detectFiles(parsedFiles);
  updateStep(steps, 'detecting', 'completed', onProgress);

  // Step 3: Detect affiliate files
  updateStep(steps, 'detectingAffiliate', 'running', onProgress);
  await delay(200);
  const shopeeFiles = detectedFiles.filter(f => f.fileType === 'shopee_order');
  const tiktokOrderFiles = detectedFiles.filter(f => f.fileType === 'tiktok_order');
  const tiktokAffiliateFiles = detectedFiles.filter(f => f.fileType === 'tiktok_affiliate');
  const tiktokIncomeFiles = detectedFiles.filter(f => f.fileType === 'tiktok_income');
  updateStep(steps, 'detectingAffiliate', 'completed', onProgress);

  // Step 4: Validate relationships
  updateStep(steps, 'validating', 'running', onProgress);
  await delay(200);
  const warnings = generateWarnings(
    detectedFiles,
    tiktokOrderFiles,
    tiktokAffiliateFiles,
    tiktokIncomeFiles
  );
  updateStep(steps, 'validating', 'completed', onProgress);

  // Step 5: Calculate Shopee
  updateStep(steps, 'calculatingShopee', 'running', onProgress);
  await delay(100);
  const shopeeResult = shopeeFiles.length > 0
    ? calculateShopeeEscrow(shopeeFiles)
    : null;
  updateStep(steps, 'calculatingShopee', 'completed', onProgress);

  // Step 6: Calculate TikTok
  updateStep(steps, 'calculatingTiktok', 'running', onProgress);
  await delay(100);
  const tiktokResult = tiktokOrderFiles.length > 0
    ? calculateTiktokEscrow(tiktokOrderFiles, tiktokAffiliateFiles, tiktokIncomeFiles)
    : null;
  updateStep(steps, 'calculatingTiktok', 'completed', onProgress);

  // Step 7: Generate summary
  updateStep(steps, 'generating', 'running', onProgress);
  await delay(200);

  const grandTotalEscrow =
    (shopeeResult?.totalEscrow || 0) + (tiktokResult?.totalEscrow || 0);
  const grandTotalOrders =
    (shopeeResult?.totalOrder || 0) + (tiktokResult?.totalOrder || 0);

  updateStep(steps, 'generating', 'completed', onProgress);

  // Step 8: Done
  updateStep(steps, 'completed', 'completed', onProgress);

  return {
    shopee: shopeeResult,
    tiktok: tiktokResult,
    grandTotalEscrow,
    grandTotalOrders,
    detectedFiles,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

function generateWarnings(
  allFiles: DetectedFile[],
  tiktokOrderFiles: DetectedFile[],
  tiktokAffiliateFiles: DetectedFile[],
  tiktokIncomeFiles: DetectedFile[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check for missing files
  if (tiktokOrderFiles.length > 0 && tiktokAffiliateFiles.length === 0) {
    warnings.push({
      type: 'missing_affiliate',
      message: 'validation.warningMissingAffiliate',
      severity: 'warning',
    });
  }

  if (tiktokOrderFiles.length > 0 && tiktokIncomeFiles.length === 0) {
    warnings.push({
      type: 'missing_income',
      message: 'validation.warningMissingIncome',
      severity: 'warning',
    });
  }

  // Check for low confidence
  const lowConfFiles = allFiles.filter(f => f.confidence < LOW_CONFIDENCE_THRESHOLD && f.fileType !== 'unknown');
  if (lowConfFiles.length > 0) {
    warnings.push({
      type: 'low_confidence',
      message: 'validation.warningLowConfidence',
      severity: 'warning',
    });
  }

  // Check for no Shopee files
  const shopeeFiles = allFiles.filter(f => f.fileType === 'shopee_order');
  if (shopeeFiles.length === 0) {
    warnings.push({
      type: 'no_shopee',
      message: 'No Shopee files detected',
      severity: 'info',
    });
  }

  // Check for no TikTok files
  if (tiktokOrderFiles.length === 0) {
    warnings.push({
      type: 'no_tiktok',
      message: 'No TikTok order files detected',
      severity: 'info',
    });
  }

  return warnings;
}
