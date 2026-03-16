import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NewsDashboard } from "@/components/app/news-dashboard";
import type { FeedResponse } from "@/lib/types/feed";
import { createArticle } from "@/tests/helpers/article-factory";

const mockUseFeed = vi.fn();
const mockUseQueryParams = vi.fn();
const mockUseLocalArticleState = vi.fn();
const mockShowToast = vi.fn();

vi.mock("@/hooks/use-feed", () => ({
  useFeed: (...args: unknown[]) => mockUseFeed(...args),
}));

vi.mock("@/hooks/use-query-params", () => ({
  useQueryParams: () => mockUseQueryParams(),
}));

vi.mock("@/hooks/use-local-article-state", () => ({
  useLocalArticleState: () => mockUseLocalArticleState(),
}));

vi.mock("@/components/common/toast-provider", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock("@/components/article/article-card", () => ({
  ArticleCard: ({
    article,
  }: {
    article: {
      id: string;
      title: string;
      sourceLabel: string;
    };
  }) => (
    <article data-testid="article-card">
      <h3>{article.title}</h3>
      <p>{article.sourceLabel}</p>
    </article>
  ),
}));

describe("NewsDashboard", () => {
  const topArticle = createArticle({
    id: "hn:1",
    title: "Top article",
    sourceLabel: "Hacker News",
    publishedAt: "2026-03-15T10:00:00.000Z",
    hnMeta: {
      hnId: 1,
      score: 120,
      commentsCount: 3,
      author: "alice",
    },
  });

  const topOlderArticle = createArticle({
    id: "hn:2",
    title: "Older article",
    sourceLabel: "Hacker News",
    publishedAt: "2026-03-10T10:00:00.000Z",
    hnMeta: {
      hnId: 2,
      score: 80,
      commentsCount: 10,
      author: "bob",
    },
  });

  const topNewestArticle = createArticle({
    id: "hn:3",
    title: "Newest article",
    sourceLabel: "Hacker News",
    publishedAt: "2026-03-16T09:00:00.000Z",
    hnMeta: {
      hnId: 3,
      score: 50,
      commentsCount: 1,
      author: "charlie",
    },
  });

  const officialArticle = createArticle({
    id: "official:openai:1",
    kind: "official",
    source: "openai",
    sourceLabel: "OpenAI",
    title: "Official article",
    publishedAt: "2026-03-15T09:00:00.000Z",
    officialMeta: {
      provider: "openai",
    },
    hnMeta: undefined,
  });

  const officialMetaArticle = createArticle({
    id: "official:meta:1",
    kind: "official",
    source: "meta",
    sourceLabel: "Meta",
    title: "Meta official article",
    publishedAt: "2026-03-16T08:00:00.000Z",
    officialMeta: {
      provider: "meta",
    },
    hnMeta: undefined,
  });

  const savedSnapshot = {
    id: "hn:saved",
    kind: "hn" as const,
    source: "hacker-news" as const,
    sourceLabel: "Hacker News",
    title: "Saved article",
    url: "https://example.com/saved-article",
    publishedAt: "2026-03-15T09:00:00.000Z",
    savedAt: "2026-03-16T09:00:00.000Z",
    hnMeta: {
      hnId: 999,
      score: 10,
      commentsCount: 2,
      author: "bob",
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));
    mockShowToast.mockReset();

    mockUseFeed.mockReturnValue({
      data: createFeedResponse({
        hnArticles: [topArticle, topOlderArticle, topNewestArticle],
        officialArticles: [officialArticle, officialMetaArticle],
      }),
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });

    mockUseQueryParams.mockReturnValue(createQueryParamsMock());
    mockUseLocalArticleState.mockReturnValue({
      hasLoaded: true,
      store: {
        saved: {
          "hn:saved": "2026-03-16T09:00:00.000Z",
        },
        read: {},
        savedSnapshots: {
          "hn:saved": savedSnapshot,
        },
      },
      markRead: vi.fn(),
      toggleSaved: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loading 時にローディング表示が出る", () => {
    mockUseFeed.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<NewsDashboard />);

    expect(screen.getAllByText((_, element) => element?.className.includes("animate-pulse") ?? false).length).toBeGreaterThan(0);
  });

  it("error 時にエラー表示が出る", () => {
    mockUseFeed.mockReturnValue({
      data: null,
      isLoading: false,
      error: "フィードの取得に失敗しました。",
      reload: vi.fn(),
    });

    render(<NewsDashboard />);

    expect(screen.getByText("取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("フィードの取得に失敗しました。")).toBeInTheDocument();
  });

  it("記事が 0 件のとき空状態が出る", () => {
    mockUseFeed.mockReturnValue({
      data: createFeedResponse({
        hnArticles: [],
        officialArticles: [],
      }),
      isLoading: false,
      error: null,
      reload: vi.fn(),
    });
    mockUseLocalArticleState.mockReturnValue({
      hasLoaded: true,
      store: {
        saved: {},
        read: {},
        savedSnapshots: {},
      },
      markRead: vi.fn(),
      toggleSaved: vi.fn(),
    });

    render(<NewsDashboard />);

    expect(screen.getByText("該当する注目記事がありません")).toBeInTheDocument();
  });

  it("タブ切り替えで表示対象が変わる", async () => {
    const setTab = vi.fn();
    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "top",
        setTab,
      })
    );

    const { rerender } = render(<NewsDashboard />);

    expect(screen.getByText("Top article")).toBeInTheDocument();
    expect(screen.queryByText("Official article")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /公式情報/ }));
    expect(setTab).toHaveBeenCalledWith("official");

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "official",
        setTab,
      })
    );
    rerender(<NewsDashboard />);

    expect(screen.getByText("Official article")).toBeInTheDocument();
    expect(screen.queryByText("Top article")).not.toBeInTheDocument();
  });

  it("保存済みタブでは保存済み記事だけが表示される", () => {
    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "saved",
      })
    );

    render(<NewsDashboard />);

    expect(screen.getByText("Saved article")).toBeInTheDocument();
    expect(screen.queryByText("Top article")).not.toBeInTheDocument();
    expect(screen.queryByText("Official article")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "保存済み" })).toBeInTheDocument();
    expect(screen.getAllByTestId("article-card")).toHaveLength(1);
  });

  it("検索条件が表示に反映される", async () => {
    const setQuery = vi.fn();

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        q: "",
        setQuery,
      })
    );

    const { rerender } = render(<NewsDashboard />);

    fireEvent.change(screen.getByPlaceholderText("タイトルで検索"), {
      target: { value: "Newest" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setQuery).toHaveBeenCalledWith("Newest");

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        q: "Newest",
        setQuery,
      })
    );
    rerender(<NewsDashboard />);

    expect(screen.getByText("Newest article")).toBeInTheDocument();
    expect(screen.queryByText("Top article")).not.toBeInTheDocument();
  });

  it("期間フィルタが表示に反映される", async () => {
    const setPeriod = vi.fn();

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        period: 7,
        setPeriod,
      })
    );

    const { rerender } = render(<NewsDashboard />);

    fireEvent.change(screen.getByLabelText("期間"), {
      target: { value: "3" },
    });
    expect(setPeriod).toHaveBeenCalledWith("3");

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        period: 3,
        setPeriod,
      })
    );
    rerender(<NewsDashboard />);

    expect(screen.getByText("Top article")).toBeInTheDocument();
    expect(screen.getByText("Newest article")).toBeInTheDocument();
    expect(screen.queryByText("Older article")).not.toBeInTheDocument();
  });

  it("既読フィルタが表示に反映される", async () => {
    const setReadFilter = vi.fn();

    mockUseLocalArticleState.mockReturnValue({
      hasLoaded: true,
      store: {
        saved: {
          "hn:saved": "2026-03-16T09:00:00.000Z",
        },
        read: {
          "hn:1": "2026-03-16T10:00:00.000Z",
        },
        savedSnapshots: {
          "hn:saved": savedSnapshot,
        },
      },
      markRead: vi.fn(),
      toggleSaved: vi.fn(),
    });

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        readFilter: "all",
        setReadFilter,
      })
    );

    const { rerender } = render(<NewsDashboard />);

    fireEvent.change(screen.getByLabelText("既読"), {
      target: { value: "unread" },
    });
    expect(setReadFilter).toHaveBeenCalledWith("unread");

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        readFilter: "unread",
        setReadFilter,
      })
    );
    rerender(<NewsDashboard />);

    expect(screen.queryByText("Top article")).not.toBeInTheDocument();
    expect(screen.getByText("Older article")).toBeInTheDocument();
    expect(screen.getByText("Newest article")).toBeInTheDocument();
  });

  it("公式情報タブでソース絞り込みが表示に反映される", async () => {
    const setOfficialSource = vi.fn();

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "official",
        officialSource: "all",
        setOfficialSource,
      })
    );

    const { rerender } = render(<NewsDashboard />);

    fireEvent.change(screen.getByLabelText("取得元"), {
      target: { value: "meta" },
    });
    expect(setOfficialSource).toHaveBeenCalledWith("meta");

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "official",
        officialSource: "meta",
        setOfficialSource,
      })
    );
    rerender(<NewsDashboard />);

    expect(screen.getByText("Meta official article")).toBeInTheDocument();
    expect(screen.queryByText("Official article")).not.toBeInTheDocument();
  });

  it("並び替え変更が表示順に反映される", async () => {
    const setSort = vi.fn();

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "top",
        sort: "hot",
        setSort,
      })
    );

    const { rerender } = render(<NewsDashboard />);

    expect(getRenderedTitles()).toEqual([
      "Top article",
      "Older article",
      "Newest article",
    ]);

    fireEvent.change(screen.getByLabelText("並び替え"), {
      target: { value: "newest" },
    });
    expect(setSort).toHaveBeenCalledWith("newest");

    mockUseQueryParams.mockReturnValue(
      createQueryParamsMock({
        tab: "top",
        sort: "newest",
        setSort,
      })
    );
    rerender(<NewsDashboard />);

    expect(getRenderedTitles()).toEqual([
      "Newest article",
      "Top article",
      "Older article",
    ]);
  });
});

function createFeedResponse(
  overrides: Partial<FeedResponse> = {}
): FeedResponse {
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

function createQueryParamsMock(
  overrides: Partial<ReturnType<typeof baseQueryParams>> = {}
) {
  return {
    ...baseQueryParams(),
    ...overrides,
  };
}

function baseQueryParams() {
  return {
    tab: "top" as const,
    period: 7,
    readFilter: "all" as const,
    sort: "hot" as const,
    officialSource: "all" as const,
    q: "",
    setTab: vi.fn(),
    setPeriod: vi.fn(),
    setReadFilter: vi.fn(),
    setSort: vi.fn(),
    setOfficialSource: vi.fn(),
    setQuery: vi.fn(),
  };
}

function getRenderedTitles() {
  return screen
    .getAllByTestId("article-card")
    .map((card) => within(card).getByRole("heading", { level: 3 }).textContent);
}
