"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AppTab, OfficialProvider, ReadFilter, TopArticlesSort } from "@/lib/types/article";

const validTabs: AppTab[] = ["top", "official", "saved"];
const validPeriods = [3, 7, 30];
const validReadFilters: ReadFilter[] = ["all", "unread", "read"];
const validSorts: TopArticlesSort[] = ["hot", "newest", "comments"];
const validOfficialSources: Array<OfficialProvider | "all"> = [
  "all",
  "openai",
  "anthropic",
  "google",
  "meta"
];

export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = parseValue(searchParams.get("tab"), validTabs, "top");
  const period = parsePeriod(searchParams.get("period"));
  const readFilter = parseValue(searchParams.get("read"), validReadFilters, "all");
  const sort = parseValue(searchParams.get("sort"), validSorts, "hot");
  const officialSource = parseValue(searchParams.get("source"), validOfficialSources, "all");
  const q = searchParams.get("q") ?? "";

  function updateQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  return {
    tab,
    period,
    readFilter,
    sort,
    officialSource,
    q,
    setTab: (nextTab: AppTab) => updateQuery({ tab: nextTab }),
    setPeriod: (value: string) => updateQuery({ period: String(parsePeriod(value)) }),
    setReadFilter: (value: string) =>
      updateQuery({
        read: parseValue(value, validReadFilters, "all")
      }),
    setSort: (value: string) =>
      updateQuery({
        sort: parseValue(value, validSorts, "hot")
      }),
    setOfficialSource: (value: string) =>
      updateQuery({
        source: parseValue(value, validOfficialSources, "all")
      }),
    setQuery: (value: string) => updateQuery({ q: value || null })
  };
}

function parsePeriod(value: string | null) {
  const parsed = Number(value ?? "7");
  return validPeriods.includes(parsed) ? parsed : 7;
}

function parseValue<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
) {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}
