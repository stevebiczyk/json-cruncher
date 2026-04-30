export interface CruncherProgress {
  progress: number;
  message: string;
}

export interface ProcessJsonPayload {
  jsonString: string;
  fileName: string;
  fileSizeBytes: number;
}

export type WorkerRequest =
  | {
      type: "PROCESS_JSON";
      requestId: number;
      payload: ProcessJsonPayload;
    }
  | { type: "CANCEL"; requestId: number };

export type WorkerResponse =
  | { type: "SUCCESS"; requestId: number; payload: ProcessedData }
  | { type: "PROGRESS"; requestId: number; payload: CruncherProgress }
  | { type: "ERROR"; requestId: number; payload: { error: string } };

export interface ProcessedData {
  fileName: string;
  fileSizeBytes: number;
  sourceShape: string;
  totalRecords: number;
  totalFields: number;
  numericFieldCount: number;
  stringFieldCount: number;
  booleanFieldCount: number;
  nullishFieldCount: number;
  primaryNumericField: string | null;
  primaryCategoryField: string | null;
  numericMetrics: NumericMetric[];
  histogram: HistogramBucket[];
  topItems: TopItem[];
  processingTimeMs: number;
  warnings: string[];
}

export interface NumericMetric {
  field: string;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
}

export interface HistogramBucket {
  label: string;
  count: number;
}

export interface TopItem {
  name: string;
  count: number;
}
