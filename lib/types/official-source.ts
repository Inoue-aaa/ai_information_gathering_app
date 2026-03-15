import type { OfficialProvider } from "@/lib/types/article";

export type OfficialTitleSource =
  | "extracted"
  | "feed"
  | "html"
  | "url-path"
  | "fallback";

export type OfficialTitleDebug = {
  extractedTitle?: string;
  feedTitle?: string;
  htmlTitle?: string;
  urlPathTitle?: string;
  chosenTitle: string;
  chosenSource: OfficialTitleSource;
};

export type OfficialRawArticle = {
  provider: OfficialProvider;
  sourceLabel: string;
  listingUrl: string;
  title: string;
  url: string;
  publishedAt?: string;
  titleDebug: OfficialTitleDebug;
};

export type OfficialSourceAdapter = {
  provider: OfficialProvider;
  sourceLabel: string;
  fetchArticles: (limit: number) => Promise<OfficialRawArticle[]>;
};
