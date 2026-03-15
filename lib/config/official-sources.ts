import type { OfficialProvider } from "@/lib/types/article";

export type OfficialSourceConfig = {
  provider: OfficialProvider;
  sourceLabel: string;
  listingUrl: string;
  rssUrl?: string;
  matchesArticleUrl: (url: string) => boolean;
};

export const officialSourceConfigs: OfficialSourceConfig[] = [
  {
    provider: "openai",
    sourceLabel: "OpenAI",
    listingUrl: "https://openai.com/news/",
    rssUrl: "https://openai.com/news/rss.xml",
    matchesArticleUrl: (url) =>
      /^https:\/\/openai\.com\/(index\/)?[^?#]+/.test(url) && !url.includes("/news/")
  },
  {
    provider: "anthropic",
    sourceLabel: "Anthropic",
    listingUrl: "https://www.anthropic.com/news",
    matchesArticleUrl: (url) => /^https:\/\/www\.anthropic\.com\/news\/[^?#]+/.test(url)
  },
  {
    provider: "google",
    sourceLabel: "Google",
    listingUrl: "https://blog.google/technology/ai/",
    matchesArticleUrl: (url) =>
      /^https:\/\/blog\.google\/[^?#]+/.test(url) && !url.endsWith("/technology/ai/")
  },
  {
    provider: "meta",
    sourceLabel: "Meta",
    listingUrl: "https://ai.meta.com/blog/",
    matchesArticleUrl: (url) =>
      /^https:\/\/ai\.meta\.com\/blog\/[^?#]+/.test(url) && !url.endsWith("/blog/")
  }
];
