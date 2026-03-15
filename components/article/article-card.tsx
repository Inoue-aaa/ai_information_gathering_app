"use client";

import { ArticleSummary } from "@/components/article/article-summary";
import { useArticleSummary } from "@/hooks/use-article-summary";
import type { Article } from "@/lib/types/article";
import { formatDateTime, formatRelativeAge } from "@/lib/utils/date";

export function ArticleCard({
  article,
  onToggleSaved,
  onOpen,
  onCopyUrl
}: {
  article: Article;
  onToggleSaved: (article: Article) => void;
  onOpen: (article: Article) => void;
  onCopyUrl: (article: Article) => Promise<void>;
}) {
  const displayTitle = article.title?.trim() || "タイトル未取得";
  const summary = useArticleSummary(article);

  return (
    <article className="h-full w-full min-w-0 max-w-full rounded-[24px] border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex h-full min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-medium">
          <Badge>{article.sourceLabel}</Badge>
          <Badge tone={article.isRead ? "default" : "accent"}>
            {article.isRead ? "既読" : "未読"}
          </Badge>
          {article.isSaved ? <Badge tone="success">保存済み</Badge> : null}
          <span className="text-ink/45">{formatRelativeAge(article.publishedAt)}</span>
        </div>

        <div className="min-w-0 space-y-3">
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => onOpen(article)}
            className="block min-w-0 break-words text-lg font-semibold leading-7 text-ink transition hover:text-accent"
          >
            {displayTitle}
          </a>
          <div className="flex min-w-0 flex-col gap-2 text-sm text-ink/68 sm:flex-row sm:flex-wrap sm:gap-x-4">
            <span className="shrink-0">公開: {formatDateTime(article.publishedAt)}</span>
            <span className="min-w-0 break-all text-ink/62">
              URL: {article.url}
            </span>
          </div>
          {article.hnMeta ? (
            <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm text-ink/78">
              <span>HNスコア: {article.hnMeta.score}</span>
              <span>コメント数: {article.hnMeta.commentsCount}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex min-w-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onToggleSaved(article)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              article.isSaved
                ? "bg-accent text-white hover:bg-accent/90"
                : "border border-line bg-fog text-ink hover:border-accent hover:text-accent"
            }`}
          >
            {article.isSaved ? "保存を解除" : "保存する"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onCopyUrl(article);
            }}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent"
          >
            URLをコピー
          </button>
          <button
            type="button"
            onClick={() => {
              void summary.handleSummaryAction();
            }}
            disabled={summary.isLoading}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
          >
            {summary.actionLabel}
          </button>
        </div>

        {summary.isExpanded ? (
          <ArticleSummary
            summaryEntry={summary.summaryEntry}
            isLoading={summary.isLoading}
            errorMessage={summary.errorMessage}
            storageWarning={summary.storageWarning}
          />
        ) : null}
      </div>
    </article>
  );
}

function Badge({
  children,
  tone = "default"
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "success";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accentSoft text-accent"
      : tone === "success"
        ? "bg-emerald-100 text-success"
        : "bg-fog text-ink/72";

  return (
    <span className={`max-w-full rounded-full px-3 py-1 ${toneClass}`}>
      {children}
    </span>
  );
}
