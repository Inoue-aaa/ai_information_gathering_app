import { createOfficialSourceAdapter } from "@/lib/sources/official/create-official-source-adapter";
import type { OfficialSourceConfig } from "@/lib/config/official-sources";

const fetchMock = vi.fn();

describe("createOfficialSourceAdapter", () => {
  const config: OfficialSourceConfig = {
    provider: "openai",
    sourceLabel: "OpenAI",
    listingUrl: "https://example.com/news/",
    rssUrl: "https://example.com/news/rss.xml",
    matchesArticleUrl: (url) =>
      url.startsWith("https://example.com/articles/") || url === "https://example.com/",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RSS取得成功時に RSS を優先して記事化できる", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(
          createTextResponse(`
            <rss>
              <channel>
                <item>
                  <title>OpenAI launches a new feature</title>
                  <link>https://example.com/articles/openai-feature</link>
                  <pubDate>Mon, 16 Mar 2026 10:00:00 GMT</pubDate>
                </item>
                <item>
                  <title>Ignored listing page</title>
                  <link>https://example.com/news/</link>
                </item>
              </channel>
            </rss>
          `)
        );
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(config.rssUrl, expect.any(Object));
    expect(result).toEqual([
      expect.objectContaining({
        provider: "openai",
        sourceLabel: "OpenAI",
        listingUrl: "https://example.com/news/",
        title: "OpenAI launches a new feature",
        url: "https://example.com/articles/openai-feature",
        titleDebug: expect.objectContaining({
          feedTitle: "OpenAI launches a new feature",
          chosenTitle: "OpenAI launches a new feature",
          chosenSource: "feed",
        }),
      }),
    ]);
  });

  it("RSS取得失敗時に HTML fallback が動く", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(createErrorResponse(500));
      }

      if (url === config.listingUrl) {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <body>
                <a href="/articles/from-listing">Listing title</a>
              </body>
            </html>
          `)
        );
      }

      if (url === "https://example.com/articles/from-listing") {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <head>
                <meta property="og:title" content="HTML metadata title" />
                <meta property="article:published_time" content="2026-03-15T12:00:00.000Z" />
              </head>
            </html>
          `)
        );
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(5);

    expect(fetchMock).toHaveBeenCalledWith(config.rssUrl, expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(config.listingUrl, expect.any(Object));
    expect(result).toEqual([
      expect.objectContaining({
        title: "Listing title",
        url: "https://example.com/articles/from-listing",
        publishedAt: "2026-03-15T12:00:00.000Z",
        titleDebug: expect.objectContaining({
          extractedTitle: "Listing title",
          htmlTitle: "HTML metadata title",
          chosenTitle: "Listing title",
          chosenSource: "extracted",
        }),
      }),
    ]);
  });

  it("title fallback が期待順で効く", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(createErrorResponse(500));
      }

      if (url === config.listingUrl) {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <body>
                <a href="/articles/html-title"></a>
                <a href="/articles/url-path-title"></a>
                <a href="/"></a>
              </body>
            </html>
          `)
        );
      }

      if (url === "https://example.com/articles/html-title") {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <head>
                <title>HTML title fallback</title>
              </head>
            </html>
          `)
        );
      }

      if (url === "https://example.com/articles/url-path-title") {
        return Promise.resolve(createTextResponse("<html><head></head></html>"));
      }

      if (url === "https://example.com/") {
        return Promise.resolve(createTextResponse("<html><head></head></html>"));
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(5);

    expect(result).toEqual([
      expect.objectContaining({
        url: "https://example.com/articles/html-title",
        title: "HTML title fallback",
        titleDebug: expect.objectContaining({
          chosenSource: "html",
        }),
      }),
      expect.objectContaining({
        url: "https://example.com/articles/url-path-title",
        title: "url path title",
        titleDebug: expect.objectContaining({
          urlPathTitle: "url path title",
          chosenSource: "url-path",
        }),
      }),
      expect.objectContaining({
        url: "https://example.com/",
        titleDebug: expect.objectContaining({
          chosenSource: "fallback",
        }),
      }),
    ]);
  });

  it("候補URLの絞り込みと重複除去が壊れない", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(createErrorResponse(500));
      }

      if (url === config.listingUrl) {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <body>
                <a href="/articles/keep-me">Keep me</a>
                <a href="/articles/keep-me">Duplicate</a>
                <a href="/news/">Listing page</a>
                <a href="mailto:test@example.com">Mail</a>
                <a href="javascript:void(0)">Script</a>
              </body>
            </html>
          `)
        );
      }

      if (url === "https://example.com/articles/keep-me") {
        return Promise.resolve(createTextResponse("<html><head></head></html>"));
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(5);

    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe("https://example.com/articles/keep-me");
  });

  it("metadata fetch 失敗時も安全に fallback できる", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(createErrorResponse(500));
      }

      if (url === config.listingUrl) {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <body>
                <a href="/articles/metadata-fails">Anchor text title</a>
              </body>
            </html>
          `)
        );
      }

      if (url === "https://example.com/articles/metadata-fails") {
        return Promise.resolve(createErrorResponse(503));
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(5);

    expect(result).toEqual([
      expect.objectContaining({
        title: "Anchor text title",
        url: "https://example.com/articles/metadata-fails",
        publishedAt: undefined,
        titleDebug: expect.objectContaining({
          chosenSource: "extracted",
        }),
      }),
    ]);
  });

  it("0件ケースを安全に扱える", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(createTextResponse("<rss><channel></channel></rss>"));
      }

      if (url === config.listingUrl) {
        return Promise.resolve(createTextResponse("<html><body></body></html>"));
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(5);

    expect(result).toEqual([]);
  });

  it("limit を超える候補があっても返却数を制限し、shape を保つ", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === config.rssUrl) {
        return Promise.resolve(createErrorResponse(500));
      }

      if (url === config.listingUrl) {
        return Promise.resolve(
          createTextResponse(`
            <html>
              <body>
                <a href="/articles/one">One</a>
                <a href="/articles/two">Two</a>
                <a href="/articles/three">Three</a>
              </body>
            </html>
          `)
        );
      }

      if (url.startsWith("https://example.com/articles/")) {
        return Promise.resolve(createTextResponse("<html><head></head></html>"));
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const adapter = createOfficialSourceAdapter(config);
    const result = await adapter.fetchArticles(2);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      provider: "openai",
      sourceLabel: "OpenAI",
      listingUrl: "https://example.com/news/",
    });
  });
});

function createTextResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: async () => body,
  };
}

function createErrorResponse(status: number) {
  return {
    ok: false,
    status,
    text: async () => "",
  };
}
