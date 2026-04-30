import type {
  HistogramBucket,
  NumericMetric,
  ProcessedData,
  TopItem,
  WorkerRequest,
  WorkerResponse,
} from "../types/data.types";

type JsonObject = Record<string, unknown>;

interface FieldStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
}

const preferredNumericFields = [
  "revenue",
  "amount",
  "total",
  "price",
  "value",
  "cost",
  "quantity",
  "score",
];

const preferredCategoryFields = [
  "category",
  "status",
  "type",
  "name",
  "product",
  "item",
  "customer",
  "customerId",
  "id",
];

const postWorkerMessage = (message: WorkerResponse) => {
  self.postMessage(message);
};

const reportProgress = (
  requestId: number,
  progress: number,
  message: string,
) => {
  postWorkerMessage({
    type: "PROGRESS",
    requestId,
    payload: { progress, message },
  });
};

const isObjectRecord = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const describeShape = (value: unknown) => {
  if (Array.isArray(value)) {
    return `Root array with ${value.length.toLocaleString()} items`;
  }

  if (isObjectRecord(value)) {
    return `Root object with ${Object.keys(value).length.toLocaleString()} keys`;
  }

  return `Root ${typeof value}`;
};

const findRecordArray = (value: unknown): JsonObject[] => {
  if (Array.isArray(value)) {
    return value.filter(isObjectRecord);
  }

  if (!isObjectRecord(value)) {
    return [];
  }

  let best: JsonObject[] = [];
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      const objectItems = current.filter(isObjectRecord);

      if (objectItems.length > best.length) {
        best = objectItems;
      }

      for (const item of current) {
        if (isObjectRecord(item) || Array.isArray(item)) {
          stack.push(item);
        }
      }
    } else if (isObjectRecord(current)) {
      for (const item of Object.values(current)) {
        if (isObjectRecord(item) || Array.isArray(item)) {
          stack.push(item);
        }
      }
    }
  }

  return best.length > 0 ? best : [value];
};

const valueToNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const valueToCategory = (value: unknown) => {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
};

const pickPreferredField = (
  fields: string[],
  preferredNames: string[],
  fallback: string | null,
) => {
  const lowerFieldMap = new Map(fields.map((field) => [field.toLowerCase(), field]));

  for (const name of preferredNames) {
    const match = lowerFieldMap.get(name.toLowerCase());

    if (match) {
      return match;
    }
  }

  return fallback;
};

const buildHistogram = (
  metric: NumericMetric | null,
  values: number[],
): HistogramBucket[] => {
  if (!metric || values.length === 0) {
    return [];
  }

  if (metric.min === metric.max) {
    return [{ label: String(metric.min), count: values.length }];
  }

  const bucketCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))));
  const bucketSize = (metric.max - metric.min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = metric.min + index * bucketSize;
    const end = index === bucketCount - 1 ? metric.max : start + bucketSize;

    return {
      label: `${formatNumber(start)}-${formatNumber(end)}`,
      count: 0,
    };
  });

  for (const value of values) {
    const index = Math.min(
      bucketCount - 1,
      Math.floor((value - metric.min) / bucketSize),
    );
    buckets[index].count += 1;
  }

  return buckets;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en", {
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
  }).format(value);

const processJson = (
  requestId: number,
  jsonString: string,
  fileName: string,
  fileSizeBytes: number,
): ProcessedData => {
  const startedAt = performance.now();

  reportProgress(requestId, 12, "Reading JSON text");
  const parsed = JSON.parse(jsonString) as unknown;

  reportProgress(requestId, 35, "Finding records to analyze");
  const records = findRecordArray(parsed);
  const warnings: string[] = [];

  if (records.length === 0) {
    warnings.push("No object records were found. Try a JSON array of objects.");
  }

  reportProgress(requestId, 55, "Scanning fields and values");

  const numericStats = new Map<string, FieldStats>();
  const categoryCounts = new Map<string, Map<string, number>>();
  let totalFields = 0;
  let numericFieldCount = 0;
  let stringFieldCount = 0;
  let booleanFieldCount = 0;
  let nullishFieldCount = 0;

  records.forEach((record, index) => {
    for (const [field, rawValue] of Object.entries(record)) {
      totalFields += 1;

      if (rawValue == null) {
        nullishFieldCount += 1;
        continue;
      }

      const numericValue = valueToNumber(rawValue);

      if (numericValue !== null) {
        numericFieldCount += 1;
        const stats = numericStats.get(field) ?? {
          count: 0,
          sum: 0,
          min: numericValue,
          max: numericValue,
          values: [],
        };

        stats.count += 1;
        stats.sum += numericValue;
        stats.min = Math.min(stats.min, numericValue);
        stats.max = Math.max(stats.max, numericValue);
        stats.values.push(numericValue);
        numericStats.set(field, stats);
      }

      const categoryValue = valueToCategory(rawValue);

      if (categoryValue !== null) {
        if (typeof rawValue === "string") {
          stringFieldCount += 1;
        }

        if (typeof rawValue === "boolean") {
          booleanFieldCount += 1;
        }

        const values = categoryCounts.get(field) ?? new Map<string, number>();
        values.set(categoryValue, (values.get(categoryValue) ?? 0) + 1);
        categoryCounts.set(field, values);
      }
    }

    if (index > 0 && index % 5000 === 0) {
      const progress = 55 + Math.min(30, Math.round((index / records.length) * 30));
      reportProgress(requestId, progress, `Processed ${index.toLocaleString()} records`);
    }
  });

  reportProgress(requestId, 88, "Building chart-ready summaries");

  const numericMetrics = [...numericStats.entries()]
    .map<NumericMetric>(([field, stats]) => ({
      field,
      count: stats.count,
      sum: stats.sum,
      average: stats.sum / stats.count,
      min: stats.min,
      max: stats.max,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const primaryNumericField = pickPreferredField(
    numericMetrics.map((metric) => metric.field),
    preferredNumericFields,
    numericMetrics[0]?.field ?? null,
  );
  const primaryMetric =
    numericMetrics.find((metric) => metric.field === primaryNumericField) ?? null;
  const primaryValues =
    primaryNumericField && numericStats.has(primaryNumericField)
      ? numericStats.get(primaryNumericField)?.values ?? []
      : [];

  const categoryFields = [...categoryCounts.entries()]
    .filter(([, values]) => values.size > 1)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([field]) => field);
  const primaryCategoryField = pickPreferredField(
    categoryFields,
    preferredCategoryFields,
    categoryFields[0] ?? null,
  );
  const topItems = buildTopItems(
    primaryCategoryField ? categoryCounts.get(primaryCategoryField) : undefined,
  );

  return {
    fileName,
    fileSizeBytes,
    sourceShape: describeShape(parsed),
    totalRecords: records.length,
    totalFields,
    numericFieldCount,
    stringFieldCount,
    booleanFieldCount,
    nullishFieldCount,
    primaryNumericField,
    primaryCategoryField,
    numericMetrics,
    histogram: buildHistogram(primaryMetric, primaryValues),
    topItems,
    processingTimeMs: Math.round(performance.now() - startedAt),
    warnings,
  };
};

const buildTopItems = (counts?: Map<string, number>): TopItem[] => {
  if (!counts) {
    return [];
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "CANCEL") {
    reportProgress(request.requestId, 0, "Cancelled");
    return;
  }

  try {
    const result = processJson(
      request.requestId,
      request.payload.jsonString,
      request.payload.fileName,
      request.payload.fileSizeBytes,
    );

    reportProgress(request.requestId, 100, "Done");
    postWorkerMessage({
      type: "SUCCESS",
      requestId: request.requestId,
      payload: result,
    });
  } catch (error) {
    postWorkerMessage({
      type: "ERROR",
      requestId: request.requestId,
      payload: {
        error: error instanceof Error ? error.message : "Failed to process JSON",
      },
    });
  }
};

export {};
