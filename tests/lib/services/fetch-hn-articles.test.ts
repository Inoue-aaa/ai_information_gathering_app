import { fetchHnArticles } from "@/lib/services/fetch-hn-articles";

const fetchMock = vi.fn();

describe("fetchHnArticles", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("topstories / newstories を統合し、重複を除去して AI story だけ返す", async () => {
    mockHnApi({
      topIds: [101, 102, 103],
      newIds: [103, 104],
      items: {
        101: createStory({
          id: 101,
          title: "OpenAI ships a new GPT model",
          time: unixTimeDaysAgo(1),
        }),
        102: createStory({
          id: 102,
          title: "Postgres performance tuning",
          url: "https://example.com/postgres-performance",
          time: unixTimeDaysAgo(1),
        }),
        103: createStory({
          id: 103,
          title: "Gemini CLI updates",
          time: unixTimeDaysAgo(1),
        }),
        104: createStory({
          id: 104,
          title: "Claude for coding",
          time: unixTimeDaysAgo(1),
        }),
      },
    });

    const result = await fetchHnArticles(7);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hacker-news.firebaseio.com/v0/newstories.json",
      expect.any(Object)
    );
    expect(getFetchedItemIds()).toEqual([101, 102, 103, 104]);
    expect(result.map((article) => article.id)).toEqual([
      "hn:101",
      "hn:103",
      "hn:104",
    ]);
  });

  it("story 以外と title / url / time 欠損を除外できる", async () => {
    mockHnApi({
      topIds: [201, 202, 203, 204, 205],
      newIds: [],
      items: {
        201: createStory({
          id: 201,
          title: "OpenAI article",
        }),
        202: {
          id: 202,
          type: "comment",
          title: "GPT comment",
          url: "https://example.com/comment",
          time: unixTimeDaysAgo(1),
        },
        203: createStory({
          id: 203,
          title: "",
          time: unixTimeDaysAgo(1),
        }),
        204: createStory({
          id: 204,
          title: "Gemini update",
          url: "",
          time: unixTimeDaysAgo(1),
        }),
        205: createStory({
          id: 205,
          title: "Claude release",
          time: undefined,
        }),
      },
    });

    const result = await fetchHnArticles(7);

    expect(result).toEqual([
      expect.objectContaining({
        id: "hn:201",
        title: "OpenAI article",
      }),
    ]);
  });

  it("期間フィルタが効く", async () => {
    mockHnApi({
      topIds: [301, 302],
      newIds: [],
      items: {
        301: createStory({
          id: 301,
          title: "AI agents roundup",
          time: unixTimeDaysAgo(2),
        }),
        302: createStory({
          id: 302,
          title: "Machine learning archive",
          time: unixTimeDaysAgo(10),
        }),
      },
    });

    const result = await fetchHnArticles(3);

    expect(result.map((article) => article.id)).toEqual(["hn:301"]);
  });

  it("AI キーワード抽出が期待通り動く", async () => {
    mockHnApi({
      topIds: [401, 402, 403],
      newIds: [],
      items: {
        401: createStory({
          id: 401,
          title: "Machine learning for robots",
          time: unixTimeDaysAgo(1),
        }),
        402: createStory({
          id: 402,
          title: "Database indexing",
          text: "This has no matching keywords",
          url: "https://example.com/database-indexing",
          time: unixTimeDaysAgo(1),
        }),
        403: createStory({
          id: 403,
          title: "General infrastructure",
          text: "Anthropic released a new tool",
          time: unixTimeDaysAgo(1),
        }),
      },
    });

    const result = await fetchHnArticles(7);

    expect(result.map((article) => article.id)).toEqual(["hn:401", "hn:403"]);
  });

  it("item fetch 失敗が混ざっても全体が落ちにくい", async () => {
    mockHnApi({
      topIds: [501, 502],
      newIds: [],
      items: {
        501: createStory({
          id: 501,
          title: "Meta AI release",
          time: unixTimeDaysAgo(1),
        }),
      },
      failingItemIds: [502],
    });

    const result = await fetchHnArticles(7);

    expect(result.map((article) => article.id)).toEqual(["hn:501"]);
  });

  it("0件ケースを安全に扱える", async () => {
    mockHnApi({
      topIds: [],
      newIds: [],
      items: {},
    });

    const result = await fetchHnArticles(7);

    expect(result).toEqual([]);
  });

  it("返却 shape が期待通り", async () => {
    mockHnApi({
      topIds: [601],
      newIds: [],
      items: {
        601: createStory({
          id: 601,
          by: "alice",
          descendants: 12,
          score: 88,
          title: "OpenAI API updates",
          url: "https://example.com/openai-api-updates",
          time: unixTimeDaysAgo(1),
        }),
      },
    });

    const [article] = await fetchHnArticles(7);

    expect(article).toMatchObject({
      id: "hn:601",
      kind: "hn",
      source: "hacker-news",
      sourceLabel: "Hacker News",
      title: "OpenAI API updates",
      url: "https://example.com/openai-api-updates",
      fetchedAt: "2026-03-16T12:00:00.000Z",
      hnMeta: {
        hnId: 601,
        score: 88,
        commentsCount: 12,
        author: "alice",
      },
    });
    expect(article.publishedAt).toBe(
      new Date(unixTimeDaysAgo(1) * 1000).toISOString()
    );
  });
});

function mockHnApi({
  topIds,
  newIds,
  items,
  failingItemIds = [],
}: {
  topIds: number[];
  newIds: number[];
  items: Record<number, ReturnType<typeof createStory> | Record<string, unknown>>;
  failingItemIds?: number[];
}) {
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith("/topstories.json")) {
      return Promise.resolve(createJsonResponse(topIds));
    }

    if (url.endsWith("/newstories.json")) {
      return Promise.resolve(createJsonResponse(newIds));
    }

    const itemId = Number(url.match(/item\/(\d+)\.json$/)?.[1]);

    if (failingItemIds.includes(itemId)) {
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
    }

    const item = items[itemId];
    return Promise.resolve(createJsonResponse(item));
  });
}

function getFetchedItemIds() {
  return fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes("/item/"))
    .map((url) => Number(url.match(/item\/(\d+)\.json$/)?.[1]));
}

function createStory(
  overrides: Partial<{
    id: number;
    by: string;
    descendants: number;
    score: number;
    time: number | undefined;
    title: string;
    text: string;
    type: string;
    url: string;
  }> = {}
) {
  return {
    id: 100,
    by: "alice",
    descendants: 4,
    score: 50,
    time: unixTimeDaysAgo(1),
    title: "OpenAI update",
    text: "",
    type: "story",
    url: "https://example.com/openai-update",
    ...overrides,
  };
}

function unixTimeDaysAgo(days: number) {
  return Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
}

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}
