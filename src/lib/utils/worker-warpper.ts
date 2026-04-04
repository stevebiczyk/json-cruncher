import type {
  WorkerRequest,
  WorkerResponse,
  ProcessedData,
} from "../types/data.types";

export class WorkerManager {
  private worker: Worker | null = null;
  private messageId = 0;

  /**
   * Process JSON data in a Web Worker
   * @param jsonString - Raw JSON string to process
   * @param onProgress - Optional callback for progress updates
   * @returns Promise that resolves with processed data
   */
  async processJSON(
    jsonString: string,
    onProgress?: (progress: { progress: number; message: string }) => void,
  ): Promise<ProcessedData> {
    // Create worker lazily
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../workers/data-processor.worker.ts", import.meta.url),
        { type: "module" },
      );
    }

    return new Promise<ProcessedData>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker failed to initialize"));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        switch (response.type) {
          case "SUCCESS":
            this.worker?.removeEventListener("message", handleMessage);
            resolve(response.payload);
            break;

          case "PROGRESS":
            onProgress?.(response.payload);
            break;

          case "ERROR":
            this.worker?.removeEventListener("message", handleMessage);
            reject(new Error(response.payload.error));
            break;
        }
      };

      this.worker.addEventListener("message", handleMessage);

      // Send request to worker
      const request: WorkerRequest = {
        type: "PROCESS_JSON",
        payload: jsonString,
      };
      this.worker.postMessage(request);
    });
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
}
