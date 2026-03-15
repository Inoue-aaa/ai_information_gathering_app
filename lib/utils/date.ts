const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "日時不明";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatRelativeAge(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "日時不明";
  }

  const elapsedDays = Math.floor((Date.now() - timestamp) / DAY_IN_MS);

  if (elapsedDays <= 0) {
    return "24時間以内";
  }

  if (elapsedDays === 1) {
    return "1日前";
  }

  return `${elapsedDays}日前`;
}

export function isWithinPeriod(value: string, periodDays: number) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return true;
  }

  return timestamp >= Date.now() - periodDays * DAY_IN_MS;
}
