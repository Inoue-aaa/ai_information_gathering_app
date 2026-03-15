import { formatDateTime } from "@/lib/utils/date";
import type { ArticleSummary as ArticleSummaryEntry } from "@/lib/types/summary";

export function ArticleSummary({
  summaryEntry,
  isLoading,
  errorMessage,
  storageWarning,
}: {
  summaryEntry: ArticleSummaryEntry | null;
  isLoading: boolean;
  errorMessage: string | null;
  storageWarning: string | null;
}) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-line/70 bg-fog/65 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/45">
          要約
        </p>
        <p className="mt-2 text-sm leading-6 text-ink/72">要約を生成しています...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-red-900/70">
          要約エラー
        </p>
        <p className="mt-2 text-sm leading-6 text-red-900">{errorMessage}</p>
      </div>
    );
  }

  if (!summaryEntry) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-line/70 bg-fog/65 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/45">
          要約
        </p>
        <p className="text-xs text-ink/45">
          {summaryEntry.model} / {formatDateTime(summaryEntry.generatedAt)}
        </p>
      </div>
      <p className="mt-2 text-sm leading-7 text-ink/84">{summaryEntry.summary}</p>
      {storageWarning ? (
        <p className="mt-2 text-xs text-amber-700">{storageWarning}</p>
      ) : null}
    </div>
  );
}
