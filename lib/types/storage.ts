import type { SavedArticleSnapshot } from "@/lib/types/article";

export type LocalArticleStore = {
  saved: Record<string, string>;
  read: Record<string, string>;
  savedSnapshots: Record<string, SavedArticleSnapshot>;
};
