type FeedEntry = {
  title: string;
  url: string;
  publishedAt?: string;
};

type AnchorCandidate = {
  url: string;
  text: string;
};

type PageMetadata = {
  title?: string;
  publishedAt?: string;
};

export function extractFeedEntries(xml: string): FeedEntry[] {
  const rssMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  if (rssMatches.length > 0) {
    const entries: Array<FeedEntry | null> = rssMatches
      .map((match) => {
        const block = match[1];
        const title = extractTagContent(block, "title");
        const link = extractTagContent(block, "link");
        const pubDate = extractTagContent(block, "pubDate");

        if (!title || !link) {
          return null;
        }

        return {
          title: decodeHtmlEntities(stripHtml(title)),
          url: decodeHtmlEntities(link.trim()),
          publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined
        };
      });

    return entries.filter(isFeedEntry);
  }

  const entries: Array<FeedEntry | null> = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)]
    .map((match) => {
      const block = match[1];
      const title = extractTagContent(block, "title");
      const updated = extractTagContent(block, "updated");
      const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);

      if (!title || !linkMatch?.[1]) {
        return null;
      }

      return {
        title: decodeHtmlEntities(stripHtml(title)),
        url: decodeHtmlEntities(linkMatch[1].trim()),
        publishedAt: updated ? new Date(updated).toISOString() : undefined
      };
    });

  return entries.filter(isFeedEntry);
}

export function extractAnchorCandidates(html: string, baseUrl: string): AnchorCandidate[] {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const fullTag = match[0];
      const href = match[1];
      const innerText = decodeHtmlEntities(stripHtml(match[2]));
      const ariaLabel = extractAttributeValue(fullTag, "aria-label");
      const titleAttribute = extractAttributeValue(fullTag, "title");

      return {
        url: buildAbsoluteUrl(href, baseUrl),
        text:
          normalizeTitleCandidate(innerText) ||
          normalizeTitleCandidate(ariaLabel) ||
          normalizeTitleCandidate(titleAttribute) ||
          ""
      };
    })
    .filter((anchor) => Boolean(anchor.url));
}

export async function extractPageMetadata(url: string): Promise<PageMetadata> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ai-news-dashboard/0.1"
    },
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    throw new Error(`Page request failed: ${response.status}`);
  }

  const html = await response.text();

  return {
    title:
      findMetaContent(html, "property", "og:title") ??
      findMetaContent(html, "name", "twitter:title") ??
      extractTitleTag(html),
    publishedAt:
      findMetaContent(html, "property", "article:published_time") ??
      findMetaContent(html, "name", "publish-date") ??
      findMetaContent(html, "name", "date") ??
      extractTimeDateTime(html) ??
      extractJsonLdDate(html)
  };
}

export function buildAbsoluteUrl(target: string, baseUrl: string) {
  try {
    return new URL(target, baseUrl).toString();
  } catch {
    return "";
  }
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeTitleCandidate(value?: string | null) {
  if (!value) {
    return "";
  }

  return decodeHtmlEntities(stripHtml(stripCdata(value))).replace(/\s+/g, " ").trim();
}

export function createUrlPathTitle(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments.at(-1);

    if (!lastSegment) {
      return "";
    }

    const cleaned = decodeURIComponent(lastSegment)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned;
  } catch {
    return "";
  }
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/gi, "'");
}

export function isProbablyHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function extractTagContent(block: string, tagName: string) {
  const match = block.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i")
  );
  return match?.[1] ? stripCdata(match[1]).trim() : undefined;
}

function findMetaContent(
  html: string,
  attributeName: "name" | "property",
  attributeValue: string
) {
  const contentAfterPattern = new RegExp(
    `<meta[^>]+${attributeName}=["']${escapeRegExp(attributeValue)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const contentBeforePattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attributeName}=["']${escapeRegExp(attributeValue)}["'][^>]*>`,
    "i"
  );

  return contentAfterPattern.exec(html)?.[1] ?? contentBeforePattern.exec(html)?.[1];
}

function extractTitleTag(html: string) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
}

function extractTimeDateTime(html: string) {
  return html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i)?.[1];
}

function extractJsonLdDate(html: string) {
  return html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isFeedEntry(entry: FeedEntry | null): entry is FeedEntry {
  return entry !== null;
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function extractAttributeValue(tag: string, attributeName: string) {
  const match = tag.match(
    new RegExp(`${escapeRegExp(attributeName)}=["']([^"']+)["']`, "i")
  );

  return match?.[1];
}
