export type AppTab = "top" | "official" | "saved";
export type ArticleKind = "hn" | "official";
export type OfficialProvider = "openai" | "anthropic" | "google" | "meta";
export type ArticleSource = "hacker-news" | OfficialProvider;
export type ReadFilter = "all" | "unread" | "read";
export type TopArticlesSort = "hot" | "newest" | "comments";

export type HnArticleMeta = {
  hnId: number;
  score: number;
  commentsCount: number;
  author?: string;
};

export type OfficialArticleMeta = {
  provider: OfficialProvider;
  listingUrl?: string;
  titleSource?: "extracted" | "feed" | "html" | "url-path" | "fallback";
  titleCandidates?: string[];
};

export type Article = {
  id: string;
  kind: ArticleKind;
  source: ArticleSource;
  sourceLabel: string;
  title: string;
  url: string;
  publishedAt: string;
  fetchedAt: string;
  isRead?: boolean;
  isSaved?: boolean;
  savedAt?: string;
  hnMeta?: HnArticleMeta;
  officialMeta?: OfficialArticleMeta;
};

export type SavedArticleSnapshot = {
  id: string;
  kind: ArticleKind;
  source: ArticleSource;
  sourceLabel: string;
  title: string;
  url: string;
  publishedAt: string;
  savedAt: string;
  hnMeta?: HnArticleMeta;
  officialMeta?: OfficialArticleMeta;
};
