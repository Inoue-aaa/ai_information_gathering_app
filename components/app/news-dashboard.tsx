"use client";

import { useDeferredValue } from "react";
import { ArticleCard } from "@/components/article/article-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Panel } from "@/components/common/panel";
import { useToast } from "@/components/common/toast-provider";
import { AppTabs } from "@/components/tabs/app-tabs";
import { useFeed } from "@/hooks/use-feed";
import { useLocalArticleState } from "@/hooks/use-local-article-state";
import { useQueryParams } from "@/hooks/use-query-params";
import type { Article, AppTab } from "@/lib/types/article";
import {
  buildSavedArticles,
  mergeArticlesWithLocalState,
  sortAndFilterOfficialArticles,
  sortAndFilterSavedArticles,
  sortAndFilterTopArticles,
} from "@/lib/utils/article-view";
import { formatDateTime } from "@/lib/utils/date";

const periodOptions = [
  { value: "3", label: "3日" },
  { value: "7", label: "7日" },
  { value: "30", label: "30日" },
];

const readOptions = [
  { value: "all", label: "すべて" },
  { value: "unread", label: "未読のみ" },
  { value: "read", label: "既読のみ" },
];

const topSortOptions = [
  { value: "hot", label: "注目順" },
  { value: "newest", label: "新着順" },
  { value: "comments", label: "コメント数順" },
];

const officialSourceOptions = [
  { value: "all", label: "すべて" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
] as const;

const tabEmptyCopy: Record<AppTab, { title: string; description: string }> = {
  top: {
    title: "該当する注目記事がありません",
    description: "検索語や期間を変えると、別の記事が見つかる可能性があります。",
  },
  official: {
    title: "該当する公式情報がありません",
    description: "ソース絞り込みや検索条件を見直してみてください。",
  },
  saved: {
    title: "保存済みの記事はまだありません",
    description: "気になる記事を保存すると、あとでこのタブから見返せます。",
  },
};

export function NewsDashboard() {
  const query = useQueryParams();
  const localState = useLocalArticleState();
  const { showToast } = useToast();
  const { data, isLoading, error, reload } = useFeed(query.period);
  const deferredQuery = useDeferredValue(query.q);

  const topArticles = mergeArticlesWithLocalState(
    data?.hnArticles ?? [],
    localState.store,
  );
  const officialArticles = mergeArticlesWithLocalState(
    data?.officialArticles ?? [],
    localState.store,
  );
  const savedArticles = buildSavedArticles(localState.store);

  const visibleTopArticles = sortAndFilterTopArticles(topArticles, {
    query: deferredQuery,
    periodDays: query.period,
    sortBy: query.sort,
    readFilter: query.readFilter,
  });

  const visibleOfficialArticles = sortAndFilterOfficialArticles(
    officialArticles,
    {
      query: deferredQuery,
      periodDays: query.period,
      source: query.officialSource,
      readFilter: query.readFilter,
    },
  );

  const visibleSavedArticles = sortAndFilterSavedArticles(savedArticles, {
    query: deferredQuery,
    periodDays: query.period,
    readFilter: query.readFilter,
  });

  let activeArticles: Article[] = [];

  if (query.tab === "top") {
    activeArticles = visibleTopArticles;
  } else if (query.tab === "official") {
    activeArticles = visibleOfficialArticles;
  } else {
    activeArticles = visibleSavedArticles;
  }

  const lastUpdatedLabel = data?.lastUpdated
    ? formatDateTime(data.lastUpdated)
    : "未取得";
  const articleGridClass = "grid-cols-1 gap-5 md:grid-cols-2";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl min-w-0 flex-col overflow-x-hidden px-4 pb-[calc(8.75rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-40 lg:px-8">
      <section className="mb-5 min-w-0 rounded-[28px] border border-line/90 bg-card/90 p-5 shadow-panel backdrop-blur sm:p-7">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-accent">
                AI News Watch
              </p>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  AIの最新動向の確認ダッシュボード
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-ink/72 sm:text-base">
                  Hacker News の注目記事と OpenAI / Anthropic / Google / Meta
                  の一次情報を、 日本語UIでまとめて確認できます。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <InfoCard label="最終更新" value={lastUpdatedLabel} />
              <InfoCard
                label="保存済み"
                value={`${Object.keys(localState.store.saved).length}件`}
              />
              <InfoCard
                label="表示中"
                value={`${activeArticles.length}件`}
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </div>
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.72fr))]">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium text-ink/80">検索</span>
              <input
                value={query.q}
                onChange={(event) => query.setQuery(event.target.value)}
                placeholder="タイトルで検索"
                className="h-11 min-w-0 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <SelectField
              label="期間"
              value={String(query.period)}
              onChange={query.setPeriod}
              options={periodOptions}
            />

            <SelectField
              label="既読"
              value={query.readFilter}
              onChange={query.setReadFilter}
              options={readOptions}
            />

            {query.tab === "top" ? (
              <SelectField
                label="並び替え"
                value={query.sort}
                onChange={query.setSort}
                options={topSortOptions}
              />
            ) : (
              <SelectField
                label="表示"
                value="default"
                onChange={() => undefined}
                options={[{ value: "default", label: "更新順" }]}
              />
            )}

            {query.tab === "official" ? (
              <SelectField
                label="取得元"
                value={query.officialSource}
                onChange={query.setOfficialSource}
                options={officialSourceOptions}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink/80">補足</span>
                <div className="flex h-11 items-center rounded-2xl border border-dashed border-line bg-white px-4 text-sm text-ink/55">
                  {query.tab === "saved"
                    ? "保存済みは保存日時順で表示します"
                    : "注目記事と公式情報は新しいタブで開きます"}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Panel
        title={
          query.tab === "top"
            ? "注目記事"
            : query.tab === "official"
              ? "公式情報"
              : "保存済み"
        }
        description={
          query.tab === "top"
            ? "Hacker News の AI 関連記事をキーワードベースで抽出しています。"
            : query.tab === "official"
              ? "各社の公式ページから最新情報を取得しています。"
              : "保存した時点のスナップショットを localStorage から表示しています。"
        }
        actionLabel="再読み込み"
        onAction={reload}
      >
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : activeArticles.length === 0 ? (
          <EmptyState
            title={tabEmptyCopy[query.tab].title}
            description={tabEmptyCopy[query.tab].description}
          />
        ) : (
          <div className={`grid min-w-0 ${articleGridClass}`}>
            {activeArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onCopyUrl={async (target) => {
                  try {
                    await navigator.clipboard.writeText(target.url);
                    showToast("URLをコピーしました");
                  } catch {
                    showToast("コピーに失敗しました", "error");
                  }
                }}
                onOpen={(target) => {
                  localState.markRead(target.id);
                }}
                onToggleSaved={(target) => {
                  localState.toggleSaved(target);
                }}
              />
            ))}
          </div>
        )}
      </Panel>

      <AppTabs activeTab={query.tab} onChange={query.setTab} />
    </main>
  );
}

function InfoCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white/90 px-4 py-3 ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink/45">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink/80">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-line bg-white px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
