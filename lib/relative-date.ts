function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatRelativeDate(value: string | Date, now: Date = new Date()): string {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown date";
  }

  const dayDiff = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / 86_400_000,
  );

  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;

  if (dayDiff < 30) {
    const weeks = Math.floor(dayDiff / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  const months = Math.floor(dayDiff / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

export function formatExactDateTime(value: string | Date): string {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
