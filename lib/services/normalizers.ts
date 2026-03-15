import type { Article } from "@/lib/types/article";
import type { OfficialRawArticle } from "@/lib/types/official-source";
import { buildOfficialArticleId } from "@/lib/utils/hash";

type HnStoryInput = {
  id: number;
  by?: string;
  descendants?: number;
  score?: number;
  time?: number;
  title?: string;
  url?: string;
};

export function normalizeHnStory(story: HnStoryInput, fetchedAt: string): Article {
  return {
    id: `hn:${story.id}`,
    kind: "hn",
    source: "hacker-news",
    sourceLabel: "Hacker News",
    title: story.title ?? "Untitled",
    url: story.url ?? "",
    publishedAt: new Date((story.time ?? 0) * 1000).toISOString(),
    fetchedAt,
    hnMeta: {
      hnId: story.id,
      score: story.score ?? 0,
      commentsCount: story.descendants ?? 0,
      author: story.by
    }
  };
}

export function normalizeOfficialArticle(
  article: OfficialRawArticle,
  fetchedAt: string
): Article {
  return {
    id: buildOfficialArticleId(article.provider, article.url),
    kind: "official",
    source: article.provider,
    sourceLabel: article.sourceLabel,
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt ?? fetchedAt,
    fetchedAt,
    officialMeta: {
      provider: article.provider,
      listingUrl: article.listingUrl,
      titleSource: article.titleDebug.chosenSource,
      titleCandidates: [
        article.titleDebug.extractedTitle,
        article.titleDebug.feedTitle,
        article.titleDebug.htmlTitle,
        article.titleDebug.urlPathTitle,
        article.titleDebug.chosenTitle
      ].filter((candidate): candidate is string => Boolean(candidate))
    }
  };
}
