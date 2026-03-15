"use client";

import { useEffect, useState } from "react";
import { readArticleSummary, saveArticleSummary } from "@/lib/storage/local-storage";
import type { Article } from "@/lib/types/article";
import type {
  ArticleSummary,
  ArticleSummaryRequest,
  SummarizeApiResponse,
  SummaryErrorCode,
} from "@/lib/types/summary";

export function useArticleSummary(article: Article) {
  const [summaryEntry, setSummaryEntry] = useState<ArticleSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SummaryErrorCode | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const cachedSummary = readArticleSummary(article.id);
    setSummaryEntry(cachedSummary);
    setIsExpanded(false);
    setIsLoading(false);
    setErrorMessage(null);
    setErrorCode(null);
    setStorageWarning(null);
  }, [article.id]);

  async function handleSummaryAction() {
    if (summaryEntry) {
      setIsExpanded((current) => !current);
      return;
    }

    await generateSummary();
  }

  async function generateSummary() {
    setIsLoading(true);
    setIsExpanded(true);
    setErrorMessage(null);
    setErrorCode(null);
    setStorageWarning(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          article: {
            id: article.id,
            kind: article.kind,
            source: article.source,
            sourceLabel: article.sourceLabel,
            title: article.title,
            url: article.url,
            publishedAt: article.publishedAt,
            hnMeta: article.hnMeta,
          },
        } satisfies ArticleSummaryRequest),
      });

      const payload = (await response.json()) as SummarizeApiResponse;

      if (!response.ok || !payload.ok) {
        const error = payload.ok
          ? null
          : payload.error;

        setErrorCode(error?.code ?? "generation_failed");
        setErrorMessage(toUserFacingMessage(error?.code, error?.message));
        return;
      }

      setSummaryEntry(payload.data);
      setErrorCode(null);
      setErrorMessage(null);

      const saveResult = saveArticleSummary(payload.data);
      if (!saveResult.ok) {
        setStorageWarning("要約を保存できませんでした。");
      }
    } catch {
      setErrorCode("generation_failed");
      setErrorMessage("要約の生成に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  return {
    summaryEntry,
    isExpanded,
    isLoading,
    errorMessage,
    errorCode,
    storageWarning,
    hasSummary: Boolean(summaryEntry?.summary),
    actionLabel: getActionLabel({ summaryEntry, isExpanded, isLoading, errorCode }),
    handleSummaryAction,
  };
}

function getActionLabel({
  summaryEntry,
  isExpanded,
  isLoading,
  errorCode,
}: {
  summaryEntry: ArticleSummary | null;
  isExpanded: boolean;
  isLoading: boolean;
  errorCode: SummaryErrorCode | null;
}) {
  if (isLoading) {
    return "要約中...";
  }

  if (summaryEntry) {
    return isExpanded ? "要約を閉じる" : "要約を見る";
  }

  if (errorCode) {
    return "再試行";
  }

  return "要約する";
}

function toUserFacingMessage(
  code?: SummaryErrorCode,
  fallback?: string
) {
  if (code === "rate_limited" || code === "provider_unavailable") {
    return "現在は要約を利用できません。";
  }

  if (code === "missing_api_key") {
    return "要約機能の設定が未完了です。";
  }

  if (code === "insufficient_data") {
    return "要約対象の情報が不足しています。";
  }

  if (code === "storage_error") {
    return "要約は表示できますが保存に失敗しました。";
  }

  return fallback || "要約の生成に失敗しました。";
}
