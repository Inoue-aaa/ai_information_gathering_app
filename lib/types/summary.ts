import type { Article, ArticleKind, ArticleSource } from "@/lib/types/article";

export const DEFAULT_SUMMARY_MODEL = "gemini-2.5-flash-lite";

export type SummaryModel = typeof DEFAULT_SUMMARY_MODEL | "gemini-2.5-flash";

export type ArticleSummary = {
  articleId: string;
  summary: string;
  model: SummaryModel;
  generatedAt: string;
};

export type ArticleSummaryRequest = {
  article: Pick<
    Article,
    "id" | "kind" | "source" | "sourceLabel" | "title" | "url" | "publishedAt" | "hnMeta"
  >;
};

export type SummaryErrorCode =
  | "missing_api_key"
  | "insufficient_data"
  | "generation_failed"
  | "rate_limited"
  | "provider_unavailable"
  | "storage_error"
  | "invalid_request";

export type SummaryErrorPayload = {
  code: SummaryErrorCode;
  message: string;
};

export type SummarizeApiSuccess = {
  ok: true;
  data: ArticleSummary;
};

export type SummarizeApiFailure = {
  ok: false;
  error: SummaryErrorPayload;
};

export type SummarizeApiResponse = SummarizeApiSuccess | SummarizeApiFailure;

export type SummaryPromptArticle = {
  id: string;
  kind: ArticleKind;
  source: ArticleSource;
  sourceLabel: string;
  title: string;
  url: string;
  publishedAt: string;
  hnMeta?: {
    score: number;
    commentsCount: number;
    author?: string;
  };
};
