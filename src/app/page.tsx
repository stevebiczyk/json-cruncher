"use client";

import { DataVisualizer } from "@/components/DataVisualizer";
import { FileUploader } from "@/components/FileUploader";
import { useJsonCruncher } from "@/hooks/useJsonCruncher";

export default function Home() {
  const { data, error, isBusy, progress, processFile, reset } = useJsonCruncher();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <FileUploader
        error={error}
        isBusy={isBusy}
        progress={progress}
        onFileSelected={processFile}
        onReset={reset}
      />
      <DataVisualizer data={data} isBusy={isBusy} />
    </div>
  );
}
