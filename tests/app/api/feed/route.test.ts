import { NextRequest } from "next/server";
import { GET } from "@/app/api/feed/route";
import { getFeed } from "@/lib/services/feed-service";
import { createArticle } from "@/tests/helpers/article-factory";

vi.mock("@/lib/services/feed-service", () => ({
  getFeed: vi.fn(),
}));

const mockedGetFeed = vi.mocked(getFeed);

describe("GET /api/feed", () => {
  beforeEach(() => {
    mockedGetFeed.mockReset();
  });

  it("正常時に期待 shape を返す", async () => {
    mockedGetFeed.mockResolvedValue({
      lastUpdated: "2026-03-16T12:00:00.000Z",
      hnArticles: [createArticle({ id: "hn:1", title: "Top article" })],
      officialArticles: [],
      errors: {
        hn: null,
        official: null,
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/feed?period=7")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedGetFeed).toHaveBeenCalledWith(7);
    expect(payload).toMatchObject({
      lastUpdated: "2026-03-16T12:00:00.000Z",
      hnArticles: [{ id: "hn:1", title: "Top article" }],
      officialArticles: [],
      errors: {
        hn: null,
        official: null,
      },
    });
  });

  it.each([
    { raw: null, expected: 7 },
    { raw: "abc", expected: 7 },
    { raw: "2", expected: 3 },
    { raw: "4", expected: 7 },
    { raw: "8", expected: 30 },
    { raw: "30", expected: 30 },
  ])("period=$raw を $expected に clamp / fallback する", async ({ raw, expected }) => {
    mockedGetFeed.mockResolvedValue({
      lastUpdated: "2026-03-16T12:00:00.000Z",
      hnArticles: [],
      officialArticles: [],
      errors: {
        hn: null,
        official: null,
      },
    });

    const query = raw === null ? "" : `?period=${raw}`;
    await GET(new NextRequest(`http://localhost/api/feed${query}`));

    expect(mockedGetFeed).toHaveBeenLastCalledWith(expected);
  });

  it("service 失敗時に 500 レスポンスを返す", async () => {
    mockedGetFeed.mockRejectedValue(new Error("feed service failed"));

    const response = await GET(
      new NextRequest("http://localhost/api/feed?period=7")
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      message: "feed service failed",
    });
  });
});
