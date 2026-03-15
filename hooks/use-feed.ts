"use client";

import { useEffect, useState } from "react";
import type { FeedResponse } from "@/lib/types/feed";

export function useFeed(periodDays: number) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeed() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/feed?period=${periodDays}`, {
          signal: controller.signal,
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("フィードの取得に失敗しました。");
        }

        const payload = (await response.json()) as FeedResponse;

        if (
          payload.hnArticles.length === 0 &&
          payload.officialArticles.length === 0 &&
          (payload.errors.hn || payload.errors.official)
        ) {
          throw new Error(payload.errors.hn || payload.errors.official || "フィードの取得に失敗しました。");
        }

        setData(payload);
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "フィードの取得に失敗しました。";

        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFeed();

    return () => controller.abort();
  }, [periodDays, reloadToken]);

  return {
    data,
    isLoading,
    error,
    reload: () => {
      setReloadToken((current) => current + 1);
    }
  };
}
