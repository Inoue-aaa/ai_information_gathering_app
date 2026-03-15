import type { OfficialProvider } from "@/lib/types/article";

export function buildOfficialArticleId(provider: OfficialProvider, url: string) {
  return `official:${provider}:${toSimpleHash(url)}`;
}

function toSimpleHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
