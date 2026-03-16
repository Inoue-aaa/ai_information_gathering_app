import { act, renderHook, waitFor } from "@testing-library/react";
import { useArticleSummary, toUserFacingMessage } from "@/hooks/use-article-summary";
import { createArticle } from "@/tests/helpers/article-factory";

describe("toUserFacingMessage", () => {
  it("rate_limited を利用不可メッセージへ変換する", () => {
    expect(toUserFacingMessage("rate_limited")).toContain("現在は要約を利用できません");
  });

  it("provider_unavailable を利用不可メッセージへ変換する", () => {
    expect(toUserFacingMessage("provider_unavailable")).toContain(
      "現在は要約を利用できません"
    );
  });

  it("missing_api_key を設定未完了メッセージへ変換する", () => {
    expect(toUserFacingMessage("missing_api_key")).toBe("要約機能の設定が未完了です。");
  });

  it("insufficient_data を情報不足メッセージへ変換する", () => {
    expect(toUserFacingMessage("insufficient_data")).toBe(
      "要約対象の情報が不足しています。"
    );
  });

  it("storage_error を保存失敗メッセージへ変換する", () => {
    expect(toUserFacingMessage("storage_error")).toBe(
      "要約は表示できますが保存に失敗しました。"
    );
  });

  it("fallback があればそれを返す", () => {
    expect(toUserFacingMessage(undefined, "fallback")).toBe("fallback");
  });
});

describe("useArticleSummary", () => {
  const article = createArticle({ id: "hn:summary-1" });
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("localStorage に既存要約がある場合は API を呼ばずに利用する", async () => {
    window.localStorage.setItem(
      "ai-news:summaries",
      JSON.stringify({
        [article.id]: {
          articleId: article.id,
          summary: "保存済みの要約です。",
          model: "gemini-2.5-flash-lite",
          generatedAt: "2026-03-16T12:00:00.000Z",
        },
      })
    );

    const { result } = renderHook(() => useArticleSummary(article));

    await waitFor(() => {
      expect(result.current.summaryEntry?.summary).toBe("保存済みの要約です。");
    });

    await act(async () => {
      await result.current.handleSummaryAction();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.actionLabel).toBe("要約を閉じる");
  });

  it("要約がない場合は API 成功時に state と localStorage に反映される", async () => {
    let resolveFetch!: (value: {
      ok: boolean;
      json: () => Promise<{
        ok: true;
        data: {
          articleId: string;
          summary: string;
          model: "gemini-2.5-flash-lite";
          generatedAt: string;
        };
      }>;
    }) => void;

    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useArticleSummary(article));

    let promise!: Promise<void>;

    await act(async () => {
      promise = result.current.handleSummaryAction();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    resolveFetch({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          articleId: article.id,
          summary: "APIから返った要約です。",
          model: "gemini-2.5-flash-lite",
          generatedAt: "2026-03-16T12:00:00.000Z",
        },
      }),
    });

    await act(async () => {
      await promise;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.summaryEntry?.summary).toBe("APIから返った要約です。");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isExpanded).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("ai-news:summaries") || "{}")).toMatchObject({
      [article.id]: {
        articleId: article.id,
        summary: "APIから返った要約です。",
      },
    });
  });

  it("API 失敗時にエラー状態になる", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: {
          code: "generation_failed",
          message: "生成に失敗しました。",
        },
      }),
    });

    const { result } = renderHook(() => useArticleSummary(article));

    await act(async () => {
      await result.current.handleSummaryAction();
    });

    expect(result.current.errorCode).toBe("generation_failed");
    expect(result.current.errorMessage).toBe("生成に失敗しました。");
    expect(result.current.summaryEntry).toBeNull();
    expect(result.current.actionLabel).toBe("再試行");
  });

  it("rate_limited をユーザー向け文言に変換する", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: {
          code: "rate_limited",
          message: "rate limited",
        },
      }),
    });

    const { result } = renderHook(() => useArticleSummary(article));

    await act(async () => {
      await result.current.handleSummaryAction();
    });

    expect(result.current.errorCode).toBe("rate_limited");
    expect(result.current.errorMessage).toContain("現在は要約を利用できません");
  });

  it("provider_unavailable をユーザー向け文言に変換する", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: {
          code: "provider_unavailable",
          message: "unavailable",
        },
      }),
    });

    const { result } = renderHook(() => useArticleSummary(article));

    await act(async () => {
      await result.current.handleSummaryAction();
    });

    expect(result.current.errorCode).toBe("provider_unavailable");
    expect(result.current.errorMessage).toContain("現在は要約を利用できません");
  });

  it("保存に失敗しても要約表示は維持し、storageWarning を出す", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation((key: string, value: string) => {
        if (key === "ai-news:summaries") {
          throw new Error("storage failed");
        }

        return Reflect.apply(Storage.prototype.setItem, window.localStorage, [key, value]);
      });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          articleId: article.id,
          summary: "保存できないが表示はされる要約です。",
          model: "gemini-2.5-flash-lite",
          generatedAt: "2026-03-16T12:00:00.000Z",
        },
      }),
    });

    const { result } = renderHook(() => useArticleSummary(article));

    await act(async () => {
      await result.current.handleSummaryAction();
    });

    expect(result.current.summaryEntry?.summary).toBe("保存できないが表示はされる要約です。");
    expect(result.current.storageWarning).toBe("要約を保存できませんでした。");

    setItemSpy.mockRestore();
  });

  it("fetch が reject した場合もエラー状態になる", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useArticleSummary(article));

    await act(async () => {
      await result.current.handleSummaryAction();
    });

    expect(result.current.errorCode).toBe("generation_failed");
    expect(result.current.errorMessage).toBe("要約の生成に失敗しました。");
    expect(result.current.isLoading).toBe(false);
  });
});
