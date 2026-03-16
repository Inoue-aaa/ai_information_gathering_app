import { act, renderHook, waitFor } from "@testing-library/react";
import { useLocalArticleState } from "@/hooks/use-local-article-state";
import { createArticle } from "@/tests/helpers/article-factory";

describe("useLocalArticleState", () => {
  it("初回ロードで localStorage の状態を読む", async () => {
    window.localStorage.setItem(
      "ai-news:saved",
      JSON.stringify({ "hn:100": "2026-03-16T12:00:00.000Z" })
    );

    const { result } = renderHook(() => useLocalArticleState());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    expect(result.current.store.saved["hn:100"]).toBe("2026-03-16T12:00:00.000Z");
  });

  it("markRead で state と localStorage の両方が更新される", async () => {
    const { result } = renderHook(() => useLocalArticleState());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    act(() => {
      result.current.markRead("hn:100");
    });

    expect(result.current.store.read["hn:100"]).toBeDefined();
    expect(JSON.parse(window.localStorage.getItem("ai-news:read") || "{}")).toHaveProperty(
      "hn:100"
    );
  });

  it("toggleSaved で保存状態を切り替えられる", async () => {
    const article = createArticle({ id: "hn:100" });
    const { result } = renderHook(() => useLocalArticleState());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    act(() => {
      result.current.toggleSaved(article);
    });

    expect(result.current.store.saved["hn:100"]).toBeDefined();

    act(() => {
      result.current.toggleSaved(article);
    });

    expect(result.current.store.saved["hn:100"]).toBeUndefined();
  });
});
