import { getFeed } from "@/lib/services/feed-service";
import { fetchHnArticles } from "@/lib/services/fetch-hn-articles";
import { fetchOfficialArticles } from "@/lib/services/fetch-official-articles";
import { createArticle } from "@/tests/helpers/article-factory";

vi.mock("@/lib/services/fetch-hn-articles", () => ({
  fetchHnArticles: vi.fn(),
}));

vi.mock("@/lib/services/fetch-official-articles", () => ({
  fetchOfficialArticles: vi.fn(),
}));

const mockedFetchHnArticles = vi.mocked(fetchHnArticles);
const mockedFetchOfficialArticles = vi.mocked(fetchOfficialArticles);

describe("getFeed", () => {
  beforeEach(() => {
    mockedFetchHnArticles.mockReset();
    mockedFetchOfficialArticles.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("HN / 公式情報の両方成功時に正しく集約される", async () => {
    mockedFetchHnArticles.mockResolvedValue([
      createArticle({ id: "hn:1", title: "Top article" }),
    ]);
    mockedFetchOfficialArticles.mockResolvedValue([
      createArticle({
        id: "official:openai:1",
        kind: "official",
        source: "openai",
        sourceLabel: "OpenAI",
        title: "Official article",
        hnMeta: undefined,
        officialMeta: { provider: "openai" },
      }),
    ]);

    const result = await getFeed(7);

    expect(mockedFetchHnArticles).toHaveBeenCalledWith(7);
    expect(mockedFetchOfficialArticles).toHaveBeenCalledWith(7);
    expect(result).toMatchObject({
      lastUpdated: "2026-03-16T12:00:00.000Z",
      hnArticles: [{ id: "hn:1", title: "Top article" }],
      officialArticles: [{ id: "official:openai:1", title: "Official article" }],
      errors: {
        hn: null,
        official: null,
      },
    });
  });

  it("HN だけ失敗しても公式情報だけ返せる", async () => {
    mockedFetchHnArticles.mockRejectedValue(new Error("hn failed"));
    mockedFetchOfficialArticles.mockResolvedValue([
      createArticle({
        id: "official:meta:1",
        kind: "official",
        source: "meta",
        sourceLabel: "Meta",
        title: "Meta update",
        hnMeta: undefined,
        officialMeta: { provider: "meta" },
      }),
    ]);

    const result = await getFeed(7);

    expect(result.hnArticles).toEqual([]);
    expect(result.officialArticles).toHaveLength(1);
    expect(result.errors).toEqual({
      hn: "hn failed",
      official: null,
    });
  });

  it("公式情報だけ失敗しても HN だけ返せる", async () => {
    mockedFetchHnArticles.mockResolvedValue([
      createArticle({ id: "hn:2", title: "Only HN" }),
    ]);
    mockedFetchOfficialArticles.mockRejectedValue(new Error("official failed"));

    const result = await getFeed(30);

    expect(result.hnArticles).toHaveLength(1);
    expect(result.officialArticles).toEqual([]);
    expect(result.errors).toEqual({
      hn: null,
      official: "official failed",
    });
  });

  it("両方失敗時も正常 shape で空配列と errors を返す", async () => {
    mockedFetchHnArticles.mockRejectedValue(new Error("hn failed"));
    mockedFetchOfficialArticles.mockRejectedValue(new Error("official failed"));

    const result = await getFeed(7);

    expect(result).toEqual({
      lastUpdated: "2026-03-16T12:00:00.000Z",
      hnArticles: [],
      officialArticles: [],
      errors: {
        hn: "hn failed",
        official: "official failed",
      },
    });
  });

  it("0件でも正常 shape を返せる", async () => {
    mockedFetchHnArticles.mockResolvedValue([]);
    mockedFetchOfficialArticles.mockResolvedValue([]);

    const result = await getFeed(3);

    expect(result).toEqual({
      lastUpdated: "2026-03-16T12:00:00.000Z",
      hnArticles: [],
      officialArticles: [],
      errors: {
        hn: null,
        official: null,
      },
    });
  });

  it("Error 以外の reject は fallback message に変換する", async () => {
    mockedFetchHnArticles.mockRejectedValue("plain failure");
    mockedFetchOfficialArticles.mockResolvedValue([]);

    const result = await getFeed(7);

    expect(result.errors.hn).toBeTruthy();
    expect(result.errors.official).toBeNull();
    expect(result.hnArticles).toEqual([]);
    expect(result.officialArticles).toEqual([]);
  });
});
