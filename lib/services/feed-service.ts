import { fetchHnArticles } from "@/lib/services/fetch-hn-articles";
import { fetchOfficialArticles } from "@/lib/services/fetch-official-articles";
import type { FeedResponse } from "@/lib/types/feed";

export async function getFeed(periodDays: number): Promise<FeedResponse> {
  const [hnResult, officialResult] = await Promise.allSettled([
    fetchHnArticles(periodDays),
    fetchOfficialArticles(periodDays)
  ]);

  return {
    lastUpdated: new Date().toISOString(),
    hnArticles: hnResult.status === "fulfilled" ? hnResult.value : [],
    officialArticles: officialResult.status === "fulfilled" ? officialResult.value : [],
    errors: {
      hn: hnResult.status === "rejected" ? errorToMessage(hnResult.reason) : null,
      official: officialResult.status === "rejected" ? errorToMessage(officialResult.reason) : null
    }
  };
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : "不明なエラーが発生しました。";
}
