import type { Article } from "@/lib/types/article";

export function createArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "hn:100",
    kind: "hn",
    source: "hacker-news",
    sourceLabel: "Hacker News",
    title: "OpenAI releases a new model",
    url: "https://example.com/openai-model",
    publishedAt: "2026-03-15T09:00:00.000Z",
    fetchedAt: "2026-03-16T00:00:00.000Z",
    hnMeta: {
      hnId: 100,
      score: 120,
      commentsCount: 42,
      author: "alice",
    },
    ...overrides,
  };
}
