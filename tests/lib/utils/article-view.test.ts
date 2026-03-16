import {
  buildSavedArticles,
  mergeArticlesWithLocalState,
  sortAndFilterOfficialArticles,
  sortAndFilterSavedArticles,
  sortAndFilterTopArticles,
} from "@/lib/utils/article-view";
import { createArticle } from "@/tests/helpers/article-factory";

describe("article-view utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("検索語でタイトルを絞り込める", () => {
    const articles = [
      createArticle({ id: "hn:1", title: "OpenAI launches a tool" }),
      createArticle({ id: "hn:2", title: "Database scaling tips" }),
    ];

    const result = sortAndFilterTopArticles(articles, {
      query: "openai",
      periodDays: 7,
      sortBy: "hot",
      readFilter: "all",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("hn:1");
  });

  it("期間フィルタと既読フィルタを両方適用できる", () => {
    const articles = [
      createArticle({
        id: "hn:1",
        title: "Fresh",
        isRead: true,
        publishedAt: "2026-03-15T09:00:00.000Z",
      }),
      createArticle({
        id: "hn:2",
        title: "Old",
        isRead: true,
        publishedAt: "2026-02-20T09:00:00.000Z",
      }),
      createArticle({
        id: "hn:3",
        title: "Unread",
        isRead: false,
        publishedAt: "2026-03-15T10:00:00.000Z",
      }),
    ];

    const result = sortAndFilterTopArticles(articles, {
      query: "",
      periodDays: 7,
      sortBy: "hot",
      readFilter: "read",
    });

    expect(result.map((article) => article.id)).toEqual(["hn:1"]);
  });

  it("注目順は score -> comments -> publishedAt の順で並ぶ", () => {
    const articles = [
      createArticle({
        id: "hn:1",
        hnMeta: { hnId: 1, score: 100, commentsCount: 10, author: "a" },
      }),
      createArticle({
        id: "hn:2",
        hnMeta: { hnId: 2, score: 120, commentsCount: 1, author: "b" },
      }),
      createArticle({
        id: "hn:3",
        hnMeta: { hnId: 3, score: 100, commentsCount: 50, author: "c" },
      }),
    ];

    const result = sortAndFilterTopArticles(articles, {
      query: "",
      periodDays: 7,
      sortBy: "hot",
      readFilter: "all",
    });

    expect(result.map((article) => article.id)).toEqual(["hn:2", "hn:3", "hn:1"]);
  });

  it("公式情報は source で絞り込める", () => {
    const articles = [
      createArticle({
        id: "official:openai:1",
        kind: "official",
        source: "openai",
        sourceLabel: "OpenAI",
        hnMeta: undefined,
      }),
      createArticle({
        id: "official:meta:1",
        kind: "official",
        source: "meta",
        sourceLabel: "Meta",
        hnMeta: undefined,
      }),
    ];

    const result = sortAndFilterOfficialArticles(articles, {
      query: "",
      periodDays: 7,
      source: "openai",
      readFilter: "all",
    });

    expect(result.map((article) => article.source)).toEqual(["openai"]);
  });

  it("保存済み記事は保存日時の新しい順になる", () => {
    const store = {
      saved: {
        "hn:1": "2026-03-16T09:00:00.000Z",
        "hn:2": "2026-03-16T11:00:00.000Z",
      },
      read: {},
      savedSnapshots: {
        "hn:1": {
          ...createArticle({ id: "hn:1" }),
          savedAt: "2026-03-16T09:00:00.000Z",
        },
        "hn:2": {
          ...createArticle({ id: "hn:2" }),
          savedAt: "2026-03-16T11:00:00.000Z",
        },
      },
    };

    const savedArticles = buildSavedArticles(store);
    const result = sortAndFilterSavedArticles(savedArticles, {
      query: "",
      periodDays: 7,
      readFilter: "all",
    });

    expect(result.map((article) => article.id)).toEqual(["hn:2", "hn:1"]);
  });

  it("ローカル状態を記事へ合成できる", () => {
    const articles = [createArticle({ id: "hn:1" })];
    const merged = mergeArticlesWithLocalState(articles, {
      saved: { "hn:1": "2026-03-16T11:00:00.000Z" },
      read: { "hn:1": "2026-03-16T12:00:00.000Z" },
      savedSnapshots: {},
    });

    expect(merged[0]).toMatchObject({
      isRead: true,
      isSaved: true,
      savedAt: "2026-03-16T11:00:00.000Z",
    });
  });
});
