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

// Results returned by the worker
export interface ProcessedData {
  totalRecords: number;
  totalRevenue: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  histogram: HistogramBucket[];
  topItems: TopItem[];
  processingTimeMs: number;
}

export interface HistogramBucket {
  label: string;
  value: number;
}

export interface TopItem {
  id: string;
  name: string;
  value: number;
}
