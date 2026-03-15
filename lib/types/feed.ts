import type { Article } from "@/lib/types/article";

export type FeedResponse = {
  lastUpdated: string;
  hnArticles: Article[];
  officialArticles: Article[];
  errors: {
    hn: string | null;
    official: string | null;
  };
};
