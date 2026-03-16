import { POST } from "@/app/api/summarize/route";
import {
  SummarizeArticleError,
  summarizeArticle,
} from "@/lib/services/summarize-article";

vi.mock("@/lib/services/summarize-article", () => {
  class MockSummarizeArticleError extends Error {
    code: string;
    status: number;

    constructor(code: string, message: string, status = 500) {
      super(message);
      this.name = "SummarizeArticleError";
      this.code = code;
      this.status = status;
    }
  }

  return {
    summarizeArticle: vi.fn(),
    SummarizeArticleError: MockSummarizeArticleError,
  };
});

const mockedSummarizeArticle = vi.mocked(summarizeArticle);

describe("POST /api/summarize", () => {
  const validRequestBody = {
    article: {
      id: "hn:100",
      kind: "hn",
      source: "hacker-news",
      sourceLabel: "Hacker News",
      title: "OpenAI launches a new model",
      url: "https://example.com/openai-model",
      publishedAt: "2026-03-16T12:00:00.000Z",
      hnMeta: {
        score: 100,
        commentsCount: 50,
        author: "alice",
      },
    },
  };

  beforeEach(() => {
    mockedSummarizeArticle.mockReset();
  });

  it("入力不足なら insufficient_data を返す", async () => {
    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify({
        article: {
          id: "",
          title: "",
          url: "",
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "insufficient_data",
        message: "要約対象の情報が不足しています。",
      },
    });
  });

  it("不正な JSON なら invalid_request を返す", async () => {
    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: "{broken",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("invalid_request");
  });

  it("正常時は要約結果を返す", async () => {
    mockedSummarizeArticle.mockResolvedValue({
      articleId: "hn:100",
      summary: "これは要約です。",
      model: "gemini-2.5-flash-lite",
      generatedAt: "2026-03-16T12:00:00.000Z",
    });

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify(validRequestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedSummarizeArticle).toHaveBeenCalledWith(validRequestBody.article);
    expect(payload).toEqual({
      ok: true,
      data: {
        articleId: "hn:100",
        summary: "これは要約です。",
        model: "gemini-2.5-flash-lite",
        generatedAt: "2026-03-16T12:00:00.000Z",
      },
    });
  });

  it("API キー未設定エラーをそのまま返す", async () => {
    mockedSummarizeArticle.mockRejectedValue(
      new SummarizeArticleError(
        "missing_api_key",
        "GEMINI_API_KEY が設定されていません。",
        500
      )
    );

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify(validRequestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toEqual({
      code: "missing_api_key",
      message: "GEMINI_API_KEY が設定されていません。",
    });
  });

  it("rate_limited エラーを安定した shape で返す", async () => {
    mockedSummarizeArticle.mockRejectedValue(
      new SummarizeArticleError(
        "rate_limited",
        "現在は要約を利用できません。",
        429
      )
    );

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify(validRequestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "rate_limited",
        message: "現在は要約を利用できません。",
      },
    });
  });

  it("provider_unavailable エラーを返す", async () => {
    mockedSummarizeArticle.mockRejectedValue(
      new SummarizeArticleError(
        "provider_unavailable",
        "現在は要約を利用できません。",
        503
      )
    );

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify(validRequestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("provider_unavailable");
  });

  it("想定外エラーなら generation_failed を返す", async () => {
    mockedSummarizeArticle.mockRejectedValue(new Error("unexpected"));

    const request = new Request("http://localhost/api/summarize", {
      method: "POST",
      body: JSON.stringify(validRequestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "generation_failed",
        message: "要約の生成に失敗しました。",
      },
    });
  });
});
