export interface CruncherProgress {
  progress: number;
  message: string;
}

export type RequestId = string;

export interface ProcessJsonPayload {
  jsonString: string;
  fileName: string;
  fileSizeBytes: number;
}

export type WorkerRequest =
  | {
      type: "PROCESS_JSON";
      requestId: RequestId;
      payload: ProcessJsonPayload;
    }
  | { type: "CANCEL"; requestId: RequestId };

export type WorkerResponse =
  | { type: "SUCCESS"; requestId: RequestId; payload: ProcessedData }
  | { type: "PROGRESS"; requestId: RequestId; payload: CruncherProgress }
  | { type: "ERROR"; requestId: RequestId; payload: { error: string } };

export interface FileMetaData {
  fileName: string;
  fileSizeBytes: number;
  processingTimeMs: number;
  warnings: string[];
}

export type JsonShape = "array" | "object" | "nested" | "primitive" | "unknown";

export interface AnalysisResult {
  sourceShape: JsonShape;
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
}

export interface ProcessedData extends FileMetaData, AnalysisResult {}

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
