"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/lib/types/article";
import type { LocalArticleStore } from "@/lib/types/storage";
import {
  createDefaultLocalArticleStore,
  markArticleAsRead,
  readLocalArticleStore,
  toggleSavedArticle
} from "@/lib/storage/local-storage";

export function useLocalArticleState() {
  const [store, setStore] = useState<LocalArticleStore>(createDefaultLocalArticleStore());
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setStore(readLocalArticleStore());
    setHasLoaded(true);
  }, []);

  return {
    hasLoaded,
    store,
    markRead: (articleId: string) => {
      setStore((current) => markArticleAsRead(current, articleId));
    },
    toggleSaved: (article: Article) => {
      setStore((current) => toggleSavedArticle(current, article));
    }
  };
}
