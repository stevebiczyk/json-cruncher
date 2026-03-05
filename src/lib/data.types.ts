// ============================================
// WORKER MESSAGE TYPES
// =============================================

// Messages sent to the worker
export type WorkerRequest =
  | { type: "PROCESS_JSON"; payload: string }
  | { type: "CANCEL" };

// Messages received from the worker
export type WorkerResponse =
  | { type: "SUCCESS"; payload: ProcessedData }
  | { type: "PROGRESS"; payload: { progress: number; message: string } }
  | { type: "ERROR"; payload: { error: string } };

// ============================================
// DATA STRUCTURES
// ============================================

// Generic key-value pair for JSON objects
export interface DataItem {
  key: string;
  value: unknown;
}

// Results returned by the worker
export interface ProcessedData {
  totalItems: number;
  metrics: {
    [key: string]: number | string; // e.g., { avgPrice: 42.5, totalSales: 1000 }
  };
  histogram: HistogramBucket[];
  topItems: TopItem[];
  processingTimeMs: number;
}

export interface HistogramBucket {
  label: string; // e.g., "0-100", "Category A"
  value: number; // count or sum
}

export interface TopItem {
  id: string;
  name: string;
  value: number;
}
