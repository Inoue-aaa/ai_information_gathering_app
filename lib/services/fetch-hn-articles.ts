import { normalizeHnStory } from "@/lib/services/normalizers";
import type { Article } from "@/lib/types/article";
import { matchesAiTopic } from "@/lib/utils/text";

const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";
const STORIES_PER_BUCKET = 80;

type HnItem = {
  id: number;
  by?: string;
  descendants?: number;
  score?: number;
  time?: number;
  title?: string;
  text?: string;
  type?: string;
  url?: string;
};

export async function fetchHnArticles(periodDays: number): Promise<Article[]> {
  const fetchedAt = new Date().toISOString();
  const cutoffTime = Date.now() - periodDays * 24 * 60 * 60 * 1000;

  const [topIds, newIds] = await Promise.all([
    fetchJson<number[]>(`${HN_API_BASE}/topstories.json`),
    fetchJson<number[]>(`${HN_API_BASE}/newstories.json`)
  ]);

  const uniqueIds = Array.from(
    new Set([...topIds.slice(0, STORIES_PER_BUCKET), ...newIds.slice(0, STORIES_PER_BUCKET)])
  );

  const items = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await fetchJson<HnItem>(`${HN_API_BASE}/item/${id}.json`);
      } catch {
        return null;
      }
    })
  );

  return items
    .filter((item): item is HnItem => {
      if (!item || item.type !== "story" || !item.title || !item.url || !item.time) {
        return false;
      }

      return (
        item.time * 1000 >= cutoffTime &&
        matchesAiTopic(`${item.title} ${item.url} ${item.text ?? ""}`)
      );
    })
    .map((item) => normalizeHnStory(item, fetchedAt));
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ai-news-dashboard/0.1"
    },
    next: {
      revalidate: 0
    }
  });

  if (!response.ok) {
    throw new Error(`HN API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
