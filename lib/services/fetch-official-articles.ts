import { officialSourceConfigs } from "@/lib/config/official-sources";
import { normalizeOfficialArticle } from "@/lib/services/normalizers";
import type { Article } from "@/lib/types/article";
import type { OfficialRawArticle, OfficialSourceAdapter } from "@/lib/types/official-source";
import { createOfficialSourceAdapter } from "@/lib/sources/official/create-official-source-adapter";

const ARTICLES_PER_PROVIDER = 6;

export async function fetchOfficialArticles(periodDays: number): Promise<Article[]> {
  const fetchedAt = new Date().toISOString();
  const cutoffTime = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const adapters: OfficialSourceAdapter[] = officialSourceConfigs.map((config) =>
    createOfficialSourceAdapter(config)
  );

  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.fetchArticles(ARTICLES_PER_PROVIDER))
  );

  const rawArticles = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  return rawArticles
    .filter((article) => {
      const publishedAt = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN;

      if (Number.isNaN(publishedAt)) {
        return true;
      }

      return publishedAt >= cutoffTime;
    })
    .map((article: OfficialRawArticle) => normalizeOfficialArticle(article, fetchedAt));
}
