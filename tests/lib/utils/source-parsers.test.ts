import {
  buildAbsoluteUrl,
  createUrlPathTitle,
  decodeHtmlEntities,
  extractAnchorCandidates,
  extractFeedEntries,
  extractPageMetadata,
  isProbablyHttpUrl,
  normalizeTitleCandidate,
} from "@/lib/utils/source-parsers";

const fetchMock = vi.fn();

describe("source-parsers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("extractFeedEntries", () => {
    it("RSS から title / link / pubDate を抽出できる", () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>OpenAI launches a feature</title>
              <link>https://example.com/articles/openai-feature</link>
              <pubDate>Mon, 16 Mar 2026 10:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
      `;

      expect(extractFeedEntries(xml)).toEqual([
        {
          title: "OpenAI launches a feature",
          url: "https://example.com/articles/openai-feature",
          publishedAt: "2026-03-16T10:00:00.000Z",
        },
      ]);
    });

    it("Atom 形式から title / link / updated を抽出できる", () => {
      const xml = `
        <feed>
          <entry>
            <title>Gemini update</title>
            <link href="https://example.com/articles/gemini-update" />
            <updated>2026-03-16T09:30:00Z</updated>
          </entry>
        </feed>
      `;

      expect(extractFeedEntries(xml)).toEqual([
        {
          title: "Gemini update",
          url: "https://example.com/articles/gemini-update",
          publishedAt: "2026-03-16T09:30:00.000Z",
        },
      ]);
    });

    it("CDATA と HTML entity を適切に扱える", () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title><![CDATA[OpenAI &amp; Friends]]></title>
              <link>https://example.com/articles/openai-friends</link>
            </item>
          </channel>
        </rss>
      `;

      expect(extractFeedEntries(xml)).toEqual([
        {
          title: "OpenAI & Friends",
          url: "https://example.com/articles/openai-friends",
          publishedAt: undefined,
        },
      ]);
    });

    it("不正 / 欠損エントリや期待外形式は安全に無視する", () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>Missing link</title>
            </item>
          </channel>
        </rss>
      `;

      expect(extractFeedEntries(xml)).toEqual([]);
      expect(extractFeedEntries("")).toEqual([]);
      expect(extractFeedEntries("<html></html>")).toEqual([]);
    });
  });

  describe("extractAnchorCandidates", () => {
    it("aria-label や title 属性から fallback 抽出できる", () => {
      const html = `
        <html>
          <body>
            <a href="/articles/aria" aria-label="Aria title"></a>
            <a href="/articles/title-attr" title="Title attribute fallback"></a>
            <a href="/articles/text">Visible text</a>
          </body>
        </html>
      `;

      expect(extractAnchorCandidates(html, "https://example.com/news/")).toEqual([
        {
          url: "https://example.com/articles/aria",
          text: "Aria title",
        },
        {
          url: "https://example.com/articles/title-attr",
          text: "Title attribute fallback",
        },
        {
          url: "https://example.com/articles/text",
          text: "Visible text",
        },
      ]);
    });

    it("タイトル欠落の再発防止になる具体ケースを扱える", () => {
      const html = `
        <html>
          <body>
            <a href="/articles/empty"><span></span></a>
            <a href="/articles/with-aria"><span></span></a>
            <a href="/articles/with-title" title="Recovered title"><span></span></a>
          </body>
        </html>
      `.replace(
        '<a href="/articles/with-aria"><span></span></a>',
        '<a href="/articles/with-aria" aria-label="Recovered from aria"><span></span></a>'
      );

      expect(extractAnchorCandidates(html, "https://example.com/news/")).toEqual([
        {
          url: "https://example.com/articles/empty",
          text: "",
        },
        {
          url: "https://example.com/articles/with-aria",
          text: "Recovered from aria",
        },
        {
          url: "https://example.com/articles/with-title",
          text: "Recovered title",
        },
      ]);
    });
  });

  describe("extractPageMetadata", () => {
    it("meta 順不同でも必要情報を拾える", async () => {
      fetchMock.mockResolvedValue(
        createTextResponse(`
          <html>
            <head>
              <meta content="2026-03-15T12:00:00.000Z" property="article:published_time" />
              <meta content="Meta title first" property="og:title" />
            </head>
          </html>
        `)
      );

      await expect(
        extractPageMetadata("https://example.com/articles/meta")
      ).resolves.toEqual({
        title: "Meta title first",
        publishedAt: "2026-03-15T12:00:00.000Z",
      });
    });

    it("title / publishedAt を複数 fallback から拾える", async () => {
      fetchMock.mockResolvedValue(
        createTextResponse(`
          <html>
            <head>
              <meta name="twitter:title" content="Twitter title" />
              <meta name="date" content="2026-03-14T10:00:00.000Z" />
            </head>
          </html>
        `)
      );

      await expect(
        extractPageMetadata("https://example.com/articles/fallbacks")
      ).resolves.toEqual({
        title: "Twitter title",
        publishedAt: "2026-03-14T10:00:00.000Z",
      });
    });

    it("title tag / time / json-ld も fallback できる", async () => {
      fetchMock
        .mockResolvedValueOnce(
          createTextResponse(`
            <html>
              <head>
                <title>Title tag value</title>
              </head>
              <body>
                <time datetime="2026-03-13T10:00:00.000Z"></time>
              </body>
            </html>
          `)
        )
        .mockResolvedValueOnce(
          createTextResponse(`
            <html>
              <head></head>
              <body>
                <script type="application/ld+json">
                  {"datePublished":"2026-03-12T10:00:00.000Z"}
                </script>
              </body>
            </html>
          `)
        );

      await expect(
        extractPageMetadata("https://example.com/articles/title-tag")
      ).resolves.toEqual({
        title: "Title tag value",
        publishedAt: "2026-03-13T10:00:00.000Z",
      });

      await expect(
        extractPageMetadata("https://example.com/articles/json-ld")
      ).resolves.toEqual({
        title: undefined,
        publishedAt: "2026-03-12T10:00:00.000Z",
      });
    });

    it("fetch 失敗時は安全にエラーにする", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => "",
      });

      await expect(
        extractPageMetadata("https://example.com/articles/fail")
      ).rejects.toThrow("Page request failed: 503");
    });
  });

  describe("small helpers", () => {
    it("URL path から title fallback を生成できる", () => {
      expect(
        createUrlPathTitle("https://example.com/articles/my-great_post.html")
      ).toBe("my great post");
      expect(createUrlPathTitle("https://example.com/")).toBe("");
    });

    it("normalize / decode / url helper が安全に扱える", () => {
      expect(normalizeTitleCandidate("<strong>OpenAI &amp; Friends</strong>")).toBe(
        "OpenAI & Friends"
      );
      expect(decodeHtmlEntities("&quot;AI&quot; &amp; ML")).toBe('"AI" & ML');
      expect(buildAbsoluteUrl("/articles/test", "https://example.com/news/")).toBe(
        "https://example.com/articles/test"
      );
      expect(buildAbsoluteUrl("::bad-url", "https://example.com/news/")).toBe(
        "https://example.com/news/::bad-url"
      );
      expect(isProbablyHttpUrl("https://example.com")).toBe(true);
      expect(isProbablyHttpUrl("mailto:test@example.com")).toBe(false);
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
