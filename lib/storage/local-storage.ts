import type { Article, SavedArticleSnapshot } from "@/lib/types/article";
import type { LocalArticleStore } from "@/lib/types/storage";

const STORAGE_KEYS = {
  saved: "ai-news:saved",
  read: "ai-news:read",
  savedSnapshots: "ai-news:savedSnapshots"
} as const;

export function createDefaultLocalArticleStore(): LocalArticleStore {
  return {
    saved: {},
    read: {},
    savedSnapshots: {}
  };
}

export function readLocalArticleStore(): LocalArticleStore {
  if (typeof window === "undefined") {
    return createDefaultLocalArticleStore();
  }

  return {
    saved: safeReadRecord(STORAGE_KEYS.saved),
    read: safeReadRecord(STORAGE_KEYS.read),
    savedSnapshots: safeReadRecord<SavedArticleSnapshot>(STORAGE_KEYS.savedSnapshots)
  };
}

export function markArticleAsRead(
  current: LocalArticleStore,
  articleId: string
): LocalArticleStore {
  const next: LocalArticleStore = {
    ...current,
    read: {
      ...current.read,
      [articleId]: new Date().toISOString()
    }
  };

  persistLocalArticleStore(next);
  return next;
}

export function toggleSavedArticle(
  current: LocalArticleStore,
  article: Article
): LocalArticleStore {
  const isCurrentlySaved = Boolean(current.saved[article.id]);
  const saved = { ...current.saved };
  const savedSnapshots = { ...current.savedSnapshots };

  if (isCurrentlySaved) {
    delete saved[article.id];
    delete savedSnapshots[article.id];
  } else {
    const savedAt = new Date().toISOString();
    saved[article.id] = savedAt;
    savedSnapshots[article.id] = buildSavedSnapshot(article, savedAt);
  }

  const next: LocalArticleStore = {
    ...current,
    saved,
    savedSnapshots
  };

  persistLocalArticleStore(next);
  return next;
}

function buildSavedSnapshot(article: Article, savedAt: string): SavedArticleSnapshot {
  return {
    id: article.id,
    kind: article.kind,
    source: article.source,
    sourceLabel: article.sourceLabel,
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt,
    savedAt,
    hnMeta: article.hnMeta,
    officialMeta: article.officialMeta
  };
}

function persistLocalArticleStore(store: LocalArticleStore) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(store.saved));
  window.localStorage.setItem(STORAGE_KEYS.read, JSON.stringify(store.read));
  window.localStorage.setItem(
    STORAGE_KEYS.savedSnapshots,
    JSON.stringify(store.savedSnapshots)
  );
}

function safeReadRecord<T = string>(key: string): Record<string, T> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}
