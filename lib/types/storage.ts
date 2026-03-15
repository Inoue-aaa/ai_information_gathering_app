import type { SavedArticleSnapshot } from "@/lib/types/article";
import type { ArticleSummary } from "@/lib/types/summary";

export type LocalArticleStore = {
  saved: Record<string, string>;
  read: Record<string, string>;
  savedSnapshots: Record<string, SavedArticleSnapshot>;
};

export type SummaryStore = Record<string, ArticleSummary>;
