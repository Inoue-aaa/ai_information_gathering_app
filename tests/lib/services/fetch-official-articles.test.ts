import { fetchOfficialArticles } from "@/lib/services/fetch-official-articles";
import { createOfficialSourceAdapter } from "@/lib/sources/official/create-official-source-adapter";
import { normalizeOfficialArticle } from "@/lib/services/normalizers";
import type { OfficialRawArticle } from "@/lib/types/official-source";

vi.mock("@/lib/config/official-sources", () => ({
  officialSourceConfigs: [
    {
      provider: "openai",
      sourceLabel: "OpenAI",
      listingUrl: "https://example.com/openai",
      matchesArticleUrl: () => true,
    },
    {
      provider: "meta",
      sourceLabel: "Meta",
      listingUrl: "https://example.com/meta",
      matchesArticleUrl: () => true,
    },
    {
      provider: "google",
      sourceLabel: "Google",
      listingUrl: "https://example.com/google",
      matchesArticleUrl: () => true,
    },
  ],
}));

vi.mock("@/lib/sources/official/create-official-source-adapter", () => ({
  createOfficialSourceAdapter: vi.fn(),
}));

vi.mock("@/lib/services/normalizers", () => ({
  normalizeOfficialArticle: vi.fn(),
}));

const mockedCreateOfficialSourceAdapter = vi.mocked(createOfficialSourceAdapter);
const mockedNormalizeOfficialArticle = vi.mocked(normalizeOfficialArticle);

type Provider = "openai" | "meta" | "google";

describe("fetchOfficialArticles", () => {
  const adapterFetchers: Record<Provider, ReturnType<typeof vi.fn>> = {
    openai: vi.fn(),
    meta: vi.fn(),
    google: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00.000Z"));

    adapterFetchers.openai.mockReset();
    adapterFetchers.meta.mockReset();
    adapterFetchers.google.mockReset();
    mockedCreateOfficialSourceAdapter.mockReset();
    mockedNormalizeOfficialArticle.mockReset();

    mockedCreateOfficialSourceAdapter.mockImplementation((config) => ({
      provider: config.provider,
      sourceLabel: config.sourceLabel,
      fetchArticles: adapterFetchers[config.provider as Provider],
    }));

    mockedNormalizeOfficialArticle.mockImplementation((article, fetchedAt) => ({
      id: `official:${article.provider}:${article.url}`,
      kind: "official",
      source: article.provider,
      sourceLabel: article.sourceLabel,
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt ?? fetchedAt,
      fetchedAt,
      officialMeta: {
        provider: article.provider,
        listingUrl: article.listingUrl,
        titleSource: article.titleDebug.chosenSource,
        titleCandidates: [article.title],
      },
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("複数 provider の結果を正しく集約できる", async () => {
    adapterFetchers.openai.mockResolvedValue([
      createRawArticle({
        provider: "openai",
        sourceLabel: "OpenAI",
        title: "OpenAI article",
        url: "https://example.com/openai/article",
      }),
    ]);
    adapterFetchers.meta.mockResolvedValue([
      createRawArticle({
        provider: "meta",
        sourceLabel: "Meta",
        title: "Meta article",
        url: "https://example.com/meta/article",
      }),
    ]);
    adapterFetchers.google.mockResolvedValue([]);

    const result = await fetchOfficialArticles(7);

    expect(adapterFetchers.openai).toHaveBeenCalledWith(6);
    expect(adapterFetchers.meta).toHaveBeenCalledWith(6);
    expect(adapterFetchers.google).toHaveBeenCalledWith(6);
    expect(mockedNormalizeOfficialArticle).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      expect.objectContaining({
        source: "openai",
        sourceLabel: "OpenAI",
        title: "OpenAI article",
      }),
      expect.objectContaining({
        source: "meta",
        sourceLabel: "Meta",
        title: "Meta article",
      }),
    ]);
  });

  it("一部 provider が失敗しても他 provider の結果を返せる", async () => {
    adapterFetchers.openai.mockRejectedValue(new Error("openai failed"));
    adapterFetchers.meta.mockResolvedValue([
      createRawArticle({
        provider: "meta",
        sourceLabel: "Meta",
        title: "Meta survived",
        url: "https://example.com/meta/survived",
      }),
    ]);
    adapterFetchers.google.mockResolvedValue([]);

    const result = await fetchOfficialArticles(7);

    expect(result).toEqual([
      expect.objectContaining({
        source: "meta",
        title: "Meta survived",
      }),
    ]);
    expect(mockedNormalizeOfficialArticle).toHaveBeenCalledTimes(1);
  });

  it("全 provider 失敗時は空配列を返す", async () => {
    adapterFetchers.openai.mockRejectedValue(new Error("openai failed"));
    adapterFetchers.meta.mockRejectedValue(new Error("meta failed"));
    adapterFetchers.google.mockRejectedValue(new Error("google failed"));

    const result = await fetchOfficialArticles(7);

    expect(result).toEqual([]);
    expect(mockedNormalizeOfficialArticle).not.toHaveBeenCalled();
  });

  it("publishedAt の期間フィルタが効く", async () => {
    adapterFetchers.openai.mockResolvedValue([
      createRawArticle({
        provider: "openai",
        sourceLabel: "OpenAI",
        title: "Fresh article",
        url: "https://example.com/openai/fresh",
        publishedAt: "2026-03-15T12:00:00.000Z",
      }),
      createRawArticle({
        provider: "openai",
        sourceLabel: "OpenAI",
        title: "Old article",
        url: "https://example.com/openai/old",
        publishedAt: "2026-02-20T12:00:00.000Z",
      }),
      createRawArticle({
        provider: "openai",
        sourceLabel: "OpenAI",
        title: "Undated article",
        url: "https://example.com/openai/undated",
        publishedAt: undefined,
      }),
    ]);
    adapterFetchers.meta.mockResolvedValue([]);
    adapterFetchers.google.mockResolvedValue([]);

    const result = await fetchOfficialArticles(7);

    expect(result.map((article) => article.title)).toEqual([
      "Fresh article",
      "Undated article",
    ]);
    expect(mockedNormalizeOfficialArticle).toHaveBeenCalledTimes(2);
  });

  it("正規化呼び出しに fetchedAt と raw article を正しく渡す", async () => {
    const rawArticle = createRawArticle({
      provider: "google",
      sourceLabel: "Google",
      title: "Google AI update",
      url: "https://example.com/google/update",
    });

    adapterFetchers.openai.mockResolvedValue([]);
    adapterFetchers.meta.mockResolvedValue([]);
    adapterFetchers.google.mockResolvedValue([rawArticle]);

    await fetchOfficialArticles(30);

    expect(mockedNormalizeOfficialArticle).toHaveBeenCalledWith(
      rawArticle,
      "2026-03-16T12:00:00.000Z"
    );
  });

  it("0件時の扱いが壊れない", async () => {
    adapterFetchers.openai.mockResolvedValue([]);
    adapterFetchers.meta.mockResolvedValue([]);
    adapterFetchers.google.mockResolvedValue([]);

    const result = await fetchOfficialArticles(7);

    expect(result).toEqual([]);
    expect(mockedNormalizeOfficialArticle).not.toHaveBeenCalled();
  });
});

function createRawArticle(
  overrides: Partial<OfficialRawArticle> = {}
): OfficialRawArticle {
  return {
    provider: "openai",
    sourceLabel: "OpenAI",
    listingUrl: "https://example.com/openai",
    title: "Official article",
    url: "https://example.com/openai/article",
    publishedAt: "2026-03-15T09:00:00.000Z",
    titleDebug: {
      chosenTitle: "Official article",
      chosenSource: "feed",
      feedTitle: "Official article",
    },
    ...overrides,
  };
}
