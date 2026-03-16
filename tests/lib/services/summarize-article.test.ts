import {
  SummarizeArticleError,
  summarizeArticle,
} from "@/lib/services/summarize-article";
import { DEFAULT_SUMMARY_MODEL } from "@/lib/types/summary";

describe("summarizeArticle", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const fetchMock = vi.fn();

  const article = {
    id: "hn:100",
    kind: "hn" as const,
    source: "hacker-news" as const,
    sourceLabel: "Hacker News",
    title: "OpenAI launches a new model",
    url: "https://example.com/openai-model",
    publishedAt: "2026-03-16T12:00:00.000Z",
    hnMeta: {
      score: 100,
      commentsCount: 50,
      author: "alice",
    },
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-api-key";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:34:56.000Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();

    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("正常時は要約結果を期待 shape で返す", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: "  これは要約です。  " }],
            },
          },
        ],
      })
    );

    const result = await summarizeArticle(article);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(DEFAULT_SUMMARY_MODEL);
    expect(fetchMock.mock.calls[0][0]).toContain("test-api-key");

    const requestInit = fetchMock.mock.calls[0][1];
    expect(requestInit).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = JSON.parse(requestInit.body as string);
    expect(body.contents[0].parts[0].text).toContain("記事ID: hn:100");
    expect(body.contents[0].parts[0].text).toContain("タイトル: OpenAI launches a new model");
    expect(body.contents[0].parts[0].text).toContain("URL: https://example.com/openai-model");
    expect(body.contents[0].parts[0].text).toContain("取得元: Hacker News");
    expect(body.contents[0].parts[0].text).toContain("HNスコア: 100");
    expect(body.contents[0].parts[0].text).toContain("コメント数: 50");

    expect(result).toEqual({
      articleId: "hn:100",
      summary: "これは要約です。",
      model: DEFAULT_SUMMARY_MODEL,
      generatedAt: "2026-03-16T12:34:56.000Z",
    });
  });

  it("複数 part の text を trim して連結できる", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: " 前半 " }, { text: "" }, { text: "後半 " }],
            },
          },
        ],
      })
    );

    const result = await summarizeArticle(article);

    expect(result.summary).toBe("前半\n後半");
  });

  it("API キー未設定時は missing_api_key を投げる", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      name: "SummarizeArticleError",
      code: "missing_api_key",
      message: "GEMINI_API_KEY が設定されていません。",
      status: 500,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("入力不足時は insufficient_data を投げる", async () => {
    await expect(
      summarizeArticle({
        ...article,
        id: "",
        title: " ",
        url: " ",
      })
    ).rejects.toMatchObject({
      code: "insufficient_data",
      status: 400,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("429 は rate_limited になる", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: {
            message: "too many requests",
            status: "RESOURCE_EXHAUSTED",
          },
        },
        429
      )
    );

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      code: "rate_limited",
      message: "現在は要約を利用できません。",
      status: 429,
    });
  });

  it("503 は provider_unavailable になる", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: {
            message: "unavailable",
            status: "UNAVAILABLE",
          },
        },
        503
      )
    );

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      code: "provider_unavailable",
      message: "現在は要約を利用できません。",
      status: 503,
    });
  });

  it("400 は generation_failed と元メッセージになる", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: {
            message: "bad request",
            status: "INVALID_ARGUMENT",
          },
        },
        400
      )
    );

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      code: "generation_failed",
      message: "bad request",
      status: 400,
    });
  });

  it("想定外 status は generation_failed になる", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: {
            message: "internal error",
          },
        },
        500
      )
    );

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      code: "generation_failed",
      message: "internal error",
      status: 500,
    });
  });

  it("空文字しか返らない場合は generation_failed を投げる", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: "   " }],
            },
          },
        ],
      })
    );

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      code: "generation_failed",
      message: "要約の生成に失敗しました。",
      status: 502,
    });
  });

  it("candidates が無い不正レスポンスでも generation_failed を投げる", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({}));

    await expect(summarizeArticle(article)).rejects.toMatchObject({
      code: "generation_failed",
      message: "要約の生成に失敗しました。",
      status: 502,
    });
  });

  it("SummarizeArticleError は route 側の instanceof 前提を満たす", () => {
    const error = new SummarizeArticleError(
      "generation_failed",
      "要約の生成に失敗しました。",
      500
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SummarizeArticleError);
    expect(error.name).toBe("SummarizeArticleError");
    expect(error.code).toBe("generation_failed");
    expect(error.message).toBe("要約の生成に失敗しました。");
    expect(error.status).toBe(500);
  });
});

function createJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
