export type Marketplace = 'shopee' | 'tiktok';

export type FileType = 
  | 'shopee_order'
  | 'tiktok_order'
  | 'tiktok_affiliate'
  | 'tiktok_income'
  | 'unknown';

export interface ParsedFile {
  id: string;
  name: string;
  size: number;
  headers: string[];
  rows: Record<string, string>[];
  rawFile: File;
}

export interface DetectedFile extends ParsedFile {
  fileType: FileType;
  marketplace: Marketplace | null;
  confidence: number;
  detectionDetails: DetectionDetail[];
}

export interface DetectionDetail {
  layer: string;
  matched: boolean;
  score: number;
  reason: string;
}

export interface FileGroup {
  baseName: string;
  files: DetectedFile[];
}
