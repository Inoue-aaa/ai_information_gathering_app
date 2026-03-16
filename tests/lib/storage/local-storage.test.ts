import {
  createDefaultLocalArticleStore,
  markArticleAsRead,
  readArticleSummary,
  readLocalArticleStore,
  readSummaryStore,
  saveArticleSummary,
  toggleSavedArticle,
} from "@/lib/storage/local-storage";
import { createArticle } from "@/tests/helpers/article-factory";

describe("local-storage repository", () => {
  it("空データではデフォルト状態を返す", () => {
    expect(readLocalArticleStore()).toEqual(createDefaultLocalArticleStore());
    expect(readSummaryStore()).toEqual({});
  });

  it("壊れた JSON が入っていても安全に空状態へフォールバックする", () => {
    window.localStorage.setItem("ai-news:saved", "{broken");
    window.localStorage.setItem("ai-news:read", "[]");
    window.localStorage.setItem("ai-news:savedSnapshots", "\"invalid\"");
    window.localStorage.setItem("ai-news:summaries", "{broken");

    expect(readLocalArticleStore()).toEqual(createDefaultLocalArticleStore());
    expect(readSummaryStore()).toEqual({});
  });

  it("既読状態を保存できる", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));

    const next = markArticleAsRead(createDefaultLocalArticleStore(), "hn:100");

    expect(next.read["hn:100"]).toBe("2026-03-16T12:00:00.000Z");
    expect(readLocalArticleStore().read["hn:100"]).toBe("2026-03-16T12:00:00.000Z");

    vi.useRealTimers();
  });

  it("保存状態とスナップショットを toggle できる", () => {
    const article = createArticle({ id: "hn:100" });

    const saved = toggleSavedArticle(createDefaultLocalArticleStore(), article);
    expect(saved.saved["hn:100"]).toBeDefined();
    expect(saved.savedSnapshots["hn:100"]).toMatchObject({
      id: "hn:100",
      title: article.title,
      url: article.url,
    });

    const unsaved = toggleSavedArticle(saved, article);
    expect(unsaved.saved["hn:100"]).toBeUndefined();
    expect(unsaved.savedSnapshots["hn:100"]).toBeUndefined();
  });

  it("要約キャッシュを保存して読み出せる", () => {
    const summary = {
      articleId: "hn:100",
      summary: "これは短い要約です。",
      model: "gemini-2.5-flash-lite" as const,
      generatedAt: "2026-03-16T12:00:00.000Z",
    };

    expect(saveArticleSummary(summary)).toEqual({ ok: true });
    expect(readArticleSummary("hn:100")).toEqual(summary);
  });
});
