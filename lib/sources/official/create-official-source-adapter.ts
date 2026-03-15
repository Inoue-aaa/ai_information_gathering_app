import type { OfficialSourceConfig } from "@/lib/config/official-sources";
import type {
  OfficialRawArticle,
  OfficialSourceAdapter,
  OfficialTitleDebug,
} from "@/lib/types/official-source";
import {
  buildAbsoluteUrl,
  createUrlPathTitle,
  extractAnchorCandidates,
  extractFeedEntries,
  extractPageMetadata,
  isProbablyHttpUrl,
  normalizeTitleCandidate,
} from "@/lib/utils/source-parsers";

export function createOfficialSourceAdapter(
  config: OfficialSourceConfig
): OfficialSourceAdapter {
  return {
    provider: config.provider,
    sourceLabel: config.sourceLabel,
    async fetchArticles(limit) {
      const fromFeed = config.rssUrl ? await readFromFeed(config, limit) : [];

      if (fromFeed.length > 0) {
        return fromFeed;
      }

      return readFromListing(config, limit);
    }
  };
}

async function readFromFeed(config: OfficialSourceConfig, limit: number) {
  try {
    const xml = await fetchText(config.rssUrl!);
    const entries = extractFeedEntries(xml);

    return entries
      .filter((entry) => isProbablyHttpUrl(entry.url) && config.matchesArticleUrl(entry.url))
      .slice(0, limit)
      .map<OfficialRawArticle>((entry) =>
        buildOfficialRawArticle(config, {
          url: entry.url,
          publishedAt: entry.publishedAt,
          feedTitle: entry.title,
        })
      );
  } catch {
    return [];
  }
}

async function readFromListing(config: OfficialSourceConfig, limit: number) {
  const html = await fetchText(config.listingUrl);
  const anchors = extractAnchorCandidates(html, config.listingUrl);
  const candidates = Array.from(
    new Map(
      anchors
        .map((anchor) => ({
          url: buildAbsoluteUrl(anchor.url, config.listingUrl),
          title: normalizeTitleCandidate(anchor.text)
        }))
        .filter((anchor) => isProbablyHttpUrl(anchor.url) && config.matchesArticleUrl(anchor.url))
        .map((anchor) => [anchor.url, anchor])
    ).values()
  ).slice(0, limit * 3);

  const resolved = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const metadata = await extractPageMetadata(candidate.url);

        return buildOfficialRawArticle(config, {
          url: candidate.url,
          publishedAt: metadata.publishedAt,
          extractedTitle: candidate.title,
          htmlTitle: metadata.title,
        });
      } catch {
        return buildOfficialRawArticle(config, {
          url: candidate.url,
          extractedTitle: candidate.title,
        });
      }
    })
  );

  return resolved.slice(0, limit);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ai-news-dashboard/0.1"
    },
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    throw new Error(`Source request failed: ${response.status}`);
  }

  return response.text();
}

function buildOfficialRawArticle(
  config: OfficialSourceConfig,
  input: {
    url: string;
    publishedAt?: string;
    extractedTitle?: string;
    feedTitle?: string;
    htmlTitle?: string;
  }
): OfficialRawArticle {
  const titleDebug = resolveOfficialTitle({
    url: input.url,
    extractedTitle: input.extractedTitle,
    feedTitle: input.feedTitle,
    htmlTitle: input.htmlTitle,
  });

  return {
    provider: config.provider,
    sourceLabel: config.sourceLabel,
    listingUrl: config.listingUrl,
    title: titleDebug.chosenTitle,
    url: input.url,
    publishedAt: input.publishedAt,
    titleDebug,
  };
}

function resolveOfficialTitle(input: {
  url: string;
  extractedTitle?: string;
  feedTitle?: string;
  htmlTitle?: string;
}): OfficialTitleDebug {
  const extractedTitle = normalizeTitleCandidate(input.extractedTitle);
  const feedTitle = normalizeTitleCandidate(input.feedTitle);
  const htmlTitle = normalizeTitleCandidate(input.htmlTitle);
  const urlPathTitle = normalizeTitleCandidate(createUrlPathTitle(input.url));

  if (extractedTitle) {
    return {
      extractedTitle,
      feedTitle,
      htmlTitle,
      urlPathTitle,
      chosenTitle: extractedTitle,
      chosenSource: "extracted",
    };
  }

  if (feedTitle) {
    return {
      extractedTitle,
      feedTitle,
      htmlTitle,
      urlPathTitle,
      chosenTitle: feedTitle,
      chosenSource: "feed",
    };
  }

  if (htmlTitle) {
    return {
      extractedTitle,
      feedTitle,
      htmlTitle,
      urlPathTitle,
      chosenTitle: htmlTitle,
      chosenSource: "html",
    };
  }

  if (urlPathTitle) {
    return {
      extractedTitle,
      feedTitle,
      htmlTitle,
      urlPathTitle,
      chosenTitle: urlPathTitle,
      chosenSource: "url-path",
    };
  }

  return {
    extractedTitle,
    feedTitle,
    htmlTitle,
    urlPathTitle,
    chosenTitle: "タイトル未取得",
    chosenSource: "fallback",
  };
}
