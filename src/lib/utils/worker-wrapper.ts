import type {
  CruncherProgress,
  WorkerRequest,
  WorkerResponse,
  ProcessedData,
} from "../types/data.types";

export class WorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;
  private activeRequests = new Map<
    string,
    {
      resolve: (data: ProcessedData) => void;
      reject: (error: Error) => void;
      onProgress?: (progress: CruncherProgress) => void;
    }
  >();

  /**
   * Process JSON data in a Web Worker
   * @param file - JSON file selected by the user
   * @param onProgress - Optional callback for progress updates
   * @returns Promise that resolves with processed data
   */
  async processJSON(
    file: File,
    onProgress?: (progress: CruncherProgress) => void,
  ): Promise<ProcessedData> {
    const jsonString = await file.text();
    const requestId = crypto.randomUUID();
    this.ensureWorker();

    return new Promise<ProcessedData>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker failed to initialize"));
        return;
      }

      this.activeRequests.set(requestId, { resolve, reject, onProgress });

      const request: WorkerRequest = {
        type: "PROCESS_JSON",
        requestId,
        payload: {
          jsonString,
          fileName: file.name,
          fileSizeBytes: file.size,
        },
      };

      this.worker.postMessage(request);
    });
  }

  cancelActiveWork(): void {
    for (const requestId of this.activeRequests.keys()) {
      this.worker?.postMessage({
        type: "CANCEL",
        requestId,
      } satisfies WorkerRequest);
    }

    this.activeRequests.clear();
    this.terminate();
  }

  /**
   * Terminate the worker and clean up resources
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private ensureWorker(): void {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      new URL("../workers/jsonCruncher.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.addEventListener("message", this.handleMessage);
    this.worker.addEventListener("error", this.handleWorkerError);
  }

  private handleMessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const request = this.activeRequests.get(response.requestId);

    if (!request) {
      return;
    }

    switch (response.type) {
      case "SUCCESS":
        this.activeRequests.delete(response.requestId);
        request.resolve(response.payload);
        break;

      case "PROGRESS":
        request.onProgress?.(response.payload);
        break;

      case "ERROR":
        this.activeRequests.delete(response.requestId);
        request.reject(new Error(response.payload.error));
        break;
    }
  };

  private handleWorkerError = (event: ErrorEvent) => {
    for (const request of this.activeRequests.values()) {
      request.reject(new Error(event.message || "Worker failed"));
    }

    this.activeRequests.clear();
    this.terminate();
  };
}
