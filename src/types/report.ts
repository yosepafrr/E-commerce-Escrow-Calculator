import type { ShopeeResult } from './shopee';
import type { TiktokResult } from './tiktok';
import type { DetectedFile } from './file';

export interface CalculationResult {
  shopee: ShopeeResult | null;
  tiktok: TiktokResult | null;
  grandTotalEscrow: number;
  grandTotalOrders: number;
  detectedFiles: DetectedFile[];
  warnings: ValidationWarning[];
  timestamp: string;
}

export interface ValidationWarning {
  type: 'missing_affiliate' | 'missing_income' | 'duplicate_orders' | 'low_confidence' | 'no_shopee' | 'no_tiktok';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;
}

export type ProgressCallback = (steps: ProgressStep[]) => void;
