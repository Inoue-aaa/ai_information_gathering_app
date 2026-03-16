import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleCard } from "@/components/article/article-card";
import { createArticle } from "@/tests/helpers/article-factory";

const mockUseArticleSummary = vi.fn();

vi.mock("@/hooks/use-article-summary", () => ({
  useArticleSummary: () => mockUseArticleSummary(),
}));

describe("ArticleCard", () => {
  beforeEach(() => {
    mockUseArticleSummary.mockReturnValue({
      summaryEntry: null,
      isExpanded: false,
      isLoading: false,
      errorMessage: null,
      errorCode: null,
      storageWarning: null,
      hasSummary: false,
      actionLabel: "要約する",
      handleSummaryAction: vi.fn(),
    });
  });

  it("記事情報と主要ボタンを表示する", () => {
    render(
      <ArticleCard
        article={createArticle()}
        onToggleSaved={vi.fn()}
        onOpen={vi.fn()}
        onCopyUrl={vi.fn()}
      />
    );

    expect(screen.getByText("OpenAI releases a new model")).toBeInTheDocument();
    expect(screen.getByText("Hacker News")).toBeInTheDocument();
    expect(screen.getByText(/URL: https:\/\/example.com\/openai-model/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "URLをコピー" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "要約する" })).toBeInTheDocument();
  });

  it("保存ボタンとURLコピーボタンの操作を呼び出せる", async () => {
    const user = userEvent.setup();
    const onToggleSaved = vi.fn();
    const onCopyUrl = vi.fn().mockResolvedValue(undefined);

    render(
      <ArticleCard
        article={createArticle()}
        onToggleSaved={onToggleSaved}
        onOpen={vi.fn()}
        onCopyUrl={onCopyUrl}
      />
    );

    await user.click(screen.getByRole("button", { name: "保存する" }));
    await user.click(screen.getByRole("button", { name: "URLをコピー" }));

    expect(onToggleSaved).toHaveBeenCalledTimes(1);
    expect(onCopyUrl).toHaveBeenCalledTimes(1);
  });

  it("要約済みなら要約本文を表示できる", () => {
    mockUseArticleSummary.mockReturnValue({
      summaryEntry: {
        articleId: "hn:100",
        summary: "これはテスト用の要約です。",
        model: "gemini-2.5-flash-lite",
        generatedAt: "2026-03-16T12:00:00.000Z",
      },
      isExpanded: true,
      isLoading: false,
      errorMessage: null,
      errorCode: null,
      storageWarning: null,
      hasSummary: true,
      actionLabel: "要約を見る",
      handleSummaryAction: vi.fn(),
    });

    render(
      <ArticleCard
        article={createArticle()}
        onToggleSaved={vi.fn()}
        onOpen={vi.fn()}
        onCopyUrl={vi.fn()}
      />
    );

    expect(screen.getByText("これはテスト用の要約です。")).toBeInTheDocument();
  });

  it("要約エラー時の文言を表示する", () => {
    mockUseArticleSummary.mockReturnValue({
      summaryEntry: null,
      isExpanded: true,
      isLoading: false,
      errorMessage: "現在は要約を利用できません。",
      errorCode: "rate_limited",
      storageWarning: null,
      hasSummary: false,
      actionLabel: "再試行",
      handleSummaryAction: vi.fn(),
    });

    render(
      <ArticleCard
        article={createArticle()}
        onToggleSaved={vi.fn()}
        onOpen={vi.fn()}
        onCopyUrl={vi.fn()}
      />
    );

    expect(screen.getByText("現在は要約を利用できません。")).toBeInTheDocument();
  });
});
