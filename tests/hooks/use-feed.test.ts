import { act, renderHook, waitFor } from "@testing-library/react";
import { useFeed } from "@/hooks/use-feed";
import type { FeedResponse } from "@/lib/types/feed";
import { createArticle } from "@/tests/helpers/article-factory";

describe("useFeed", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetch 成功時にデータが state に反映され、loading が切り替わる", async () => {
    const payload = createFeedResponse({
      hnArticles: [createArticle({ id: "hn:1", title: "Top article" })],
    });

    fetchMock.mockResolvedValue(createJsonResponse(payload));

    const { result } = renderHook(() => useFeed(7));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/feed?period=7", {
      signal: expect.any(AbortSignal),
      cache: "no-store",
    });
    expect(result.current.data).toEqual(payload);
    expect(result.current.error).toBeNull();
  });

  it("0件レスポンスでも errors が空なら正常データとして扱う", async () => {
    fetchMock.mockResolvedValue(createJsonResponse(createFeedResponse()));

    const { result } = renderHook(() => useFeed(3));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data?.hnArticles).toEqual([]);
    expect(result.current.data?.officialArticles).toEqual([]);
  });

  it("fetch 失敗時に error 状態になる", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "failed" }),
    });

    const { result } = renderHook(() => useFeed(7));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("errors を持つ空レスポンスは error として扱う", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        createFeedResponse({
          errors: {
            hn: "Hacker News の取得に失敗しました",
            official: null,
          },
        })
      )
    );

    const { result } = renderHook(() => useFeed(7));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Hacker News の取得に失敗しました");
  });

  it("部分失敗でも記事が返っていれば data を保持して error にしない", async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        createFeedResponse({
          officialArticles: [
            createArticle({
              id: "official:openai:1",
              kind: "official",
              source: "openai",
              sourceLabel: "OpenAI",
              title: "Official update",
              hnMeta: undefined,
              officialMeta: { provider: "openai" },
            }),
          ],
          errors: {
            hn: "Hacker News の取得に失敗しました",
            official: null,
          },
        })
      )
    );

    const { result } = renderHook(() => useFeed(7));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data?.officialArticles).toHaveLength(1);
  });

  it("reload で再取得が走る", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(
          createFeedResponse({
            hnArticles: [createArticle({ id: "hn:1", title: "First load" })],
          })
        )
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          createFeedResponse({
            hnArticles: [createArticle({ id: "hn:2", title: "Reloaded" })],
          })
        )
      );

    const { result } = renderHook(() => useFeed(7));

    await waitFor(() => {
      expect(result.current.data?.hnArticles[0]?.title).toBe("First load");
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.data?.hnArticles[0]?.title).toBe("Reloaded");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("再実行時は前の request を abort し、後勝ちで state を更新する", async () => {
    const firstRequest = createDeferredResponse();
    const secondRequest = createDeferredResponse();

    fetchMock
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return firstRequest.promise(init?.signal as AbortSignal);
      })
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return secondRequest.promise(init?.signal as AbortSignal);
      });

    const { result, rerender } = renderHook(
      ({ period }) => useFeed(period),
      { initialProps: { period: 7 } }
    );

    const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    rerender({ period: 30 });

    expect(firstSignal.aborted).toBe(true);

    await act(async () => {
      firstRequest.resolve(
        createJsonResponse(
          createFeedResponse({
            hnArticles: [createArticle({ id: "hn:1", title: "Stale" })],
          })
        )
      );
      secondRequest.resolve(
        createJsonResponse(
          createFeedResponse({
            hnArticles: [createArticle({ id: "hn:2", title: "Fresh" })],
          })
        )
      );
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data?.hnArticles[0]?.title).toBe("Fresh");
  });
});

function createFeedResponse(overrides: Partial<FeedResponse> = {}): FeedResponse {
  return {
    lastUpdated: "2026-03-16T12:00:00.000Z",
    hnArticles: [],
    officialArticles: [],
    errors: {
      hn: null,
      official: null,
    },
    ...overrides,
  };
}

function createJsonResponse(payload: FeedResponse) {
  return {
    ok: true,
    json: async () => payload,
  };
}

function createDeferredResponse() {
  let resolvePromise!: (value: {
    ok: boolean;
    json: () => Promise<FeedResponse>;
  }) => void;

  return {
    promise: (signal: AbortSignal) =>
      new Promise<{ ok: boolean; json: () => Promise<FeedResponse> }>((res, rej) => {
        resolvePromise = (value) => {
          if (signal.aborted) {
            rej(new Error("aborted"));
            return;
          }

          res(value);
        };
      }),
    resolve(value: { ok: boolean; json: () => Promise<FeedResponse> }) {
      resolvePromise(value);
    },
  };
}
