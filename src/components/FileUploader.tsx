"use client";

import { useRef, useState } from "react";
import type { CruncherProgress } from "@/lib/types/data.types";

interface FileUploaderProps {
  isBusy: boolean;
  progress: CruncherProgress;
  error: string | null;
  onFileSelected: (file: File) => void;
  onReset: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export function FileUploader({
  isBusy,
  progress,
  error,
  onFileSelected,
  onReset,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    onFileSelected(file);
  };

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-normal text-emerald-700">
            JSON Cruncher
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Data Visualizer
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Upload a large JSON file and inspect field summaries, numeric
            distributions, and the most common values.
          </p>
        </div>

        <div
          className={`rounded-lg border-2 border-dashed p-4 transition ${
            isDragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 bg-slate-50"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="flex min-h-36 flex-col justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-950">
                {selectedFile ? selectedFile.name : "Drop JSON file"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {selectedFile
                  ? formatBytes(selectedFile.size)
                  : "Recommended size: 5-20 MB"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                type="button"
                disabled={isBusy}
                onClick={() => inputRef.current?.click()}
              >
                Select file
              </button>
              <button
                className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
                type="button"
                disabled={isBusy && !selectedFile}
                onClick={() => {
                  setSelectedFile(null);
                  onReset();
                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(progress.progress, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">{progress.message}</p>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
