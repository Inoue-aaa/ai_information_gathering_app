import type {
  Article,
  OfficialProvider,
  ReadFilter,
  SavedArticleSnapshot,
  TopArticlesSort
} from "@/lib/types/article";
import type { LocalArticleStore } from "@/lib/types/storage";
import { isWithinPeriod } from "@/lib/utils/date";
import { normalizeSearchText } from "@/lib/utils/text";

export function mergeArticlesWithLocalState(
  articles: Article[],
  store: LocalArticleStore
): Article[] {
  return articles.map((article) => ({
    ...article,
    isRead: Boolean(store.read[article.id]),
    isSaved: Boolean(store.saved[article.id]),
    savedAt: store.saved[article.id]
  }));
}

export function buildSavedArticles(store: LocalArticleStore): Article[] {
  return Object.values(store.savedSnapshots).map((snapshot) =>
    savedSnapshotToArticle(snapshot, store)
  );
}

export function sortAndFilterTopArticles(
  articles: Article[],
  options: {
    query: string;
    periodDays: number;
    sortBy: TopArticlesSort;
    readFilter: ReadFilter;
  }
) {
  return articles
    .filter((article) =>
      matchesCommonFilters(article, options.query, options.periodDays, options.readFilter)
    )
    .sort((left, right) => {
      if (options.sortBy === "newest") {
        return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
      }

      if (options.sortBy === "comments") {
        return (right.hnMeta?.commentsCount ?? 0) - (left.hnMeta?.commentsCount ?? 0);
      }

      const scoreDelta = (right.hnMeta?.score ?? 0) - (left.hnMeta?.score ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const commentsDelta =
        (right.hnMeta?.commentsCount ?? 0) - (left.hnMeta?.commentsCount ?? 0);
      if (commentsDelta !== 0) {
        return commentsDelta;
      }

      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
}

export function sortAndFilterOfficialArticles(
  articles: Article[],
  options: {
    query: string;
    periodDays: number;
    source: OfficialProvider | "all";
    readFilter: ReadFilter;
  }
) {
  return articles
    .filter((article) =>
      matchesCommonFilters(article, options.query, options.periodDays, options.readFilter)
    )
    .filter((article) => options.source === "all" || article.source === options.source)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function sortAndFilterSavedArticles(
  articles: Article[],
  options: {
    query: string;
    periodDays: number;
    readFilter: ReadFilter;
  }
) {
  return articles
    .filter((article) =>
      matchesCommonFilters(article, options.query, options.periodDays, options.readFilter)
    )
    .sort((left, right) => Date.parse(right.savedAt ?? "") - Date.parse(left.savedAt ?? ""));
}

function matchesCommonFilters(
  article: Article,
  query: string,
  periodDays: number,
  readFilter: ReadFilter
) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTitle = normalizeSearchText(article.title);

  if (normalizedQuery && !normalizedTitle.includes(normalizedQuery)) {
    return false;
  }

  if (!isWithinPeriod(article.publishedAt, periodDays)) {
    return false;
  }

  if (readFilter === "read" && !article.isRead) {
    return false;
  }

  if (readFilter === "unread" && article.isRead) {
    return false;
  }

  return true;
}

function savedSnapshotToArticle(
  snapshot: SavedArticleSnapshot,
  store: LocalArticleStore
): Article {
  return {
    ...snapshot,
    fetchedAt: snapshot.savedAt,
    isSaved: true,
    isRead: Boolean(store.read[snapshot.id]),
    savedAt: store.saved[snapshot.id] ?? snapshot.savedAt
  };
}
