"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CruncherProgress,
  ProcessedData,
} from "@/lib/types/data.types";
import { WorkerManager } from "@/lib/utils/worker-warpper";

type CruncherStatus = "idle" | "reading" | "processing" | "success" | "error";

export interface CruncherState {
  status: CruncherStatus;
  progress: CruncherProgress;
  data: ProcessedData | null;
  error: string | null;
}

const initialProgress: CruncherProgress = {
  progress: 0,
  message: "Choose a JSON file to begin",
};

export function useJsonCruncher() {
  const managerRef = useRef<WorkerManager | null>(null);
  const [state, setState] = useState<CruncherState>({
    status: "idle",
    progress: initialProgress,
    data: null,
    error: null,
  });

  useEffect(() => {
    managerRef.current = new WorkerManager();

    return () => {
      managerRef.current?.terminate();
      managerRef.current = null;
    };
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!managerRef.current) {
      managerRef.current = new WorkerManager();
    }

    setState({
      status: "reading",
      progress: { progress: 4, message: "Loading file into memory" },
      data: null,
      error: null,
    });

    try {
      const data = await managerRef.current.processJSON(file, (progress) => {
        setState((current) => ({
          ...current,
          status: "processing",
          progress,
        }));
      });

      setState({
        status: "success",
        progress: { progress: 100, message: "Analysis complete" },
        data,
        error: null,
      });
    } catch (error) {
      setState({
        status: "error",
        progress: { progress: 0, message: "Analysis failed" },
        data: null,
        error: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  }, []);

  const reset = useCallback(() => {
    managerRef.current?.cancelActiveWork();
    managerRef.current = new WorkerManager();
    setState({
      status: "idle",
      progress: initialProgress,
      data: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    isBusy: state.status === "reading" || state.status === "processing",
    processFile,
    reset,
  };
}
