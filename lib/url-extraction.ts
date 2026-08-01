const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_SIMPLE_PUNCTUATION = new Set([".", ",", ";", ":", "!", "?", "'", '"']);

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function countOccurrences(value: string, char: string): number {
  return value.split(char).length - 1;
}

function stripTrailingPunctuation(value: string): string {
  let result = value;

  while (result.length > 0) {
    const last = result[result.length - 1];

    if (last === ")" || last === "]") {
      const open = last === ")" ? "(" : "[";
      if (countOccurrences(result, last) > countOccurrences(result, open)) {
        result = result.slice(0, -1);
        continue;
      }
      break;
    }

    if (TRAILING_SIMPLE_PUNCTUATION.has(last)) {
      result = result.slice(0, -1);
      continue;
    }

    break;
  }

  return result;
}

export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];

  const matches = text.match(URL_PATTERN) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const cleaned = stripTrailingPunctuation(match);
    if (!cleaned || !isHttpUrl(cleaned)) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    urls.push(cleaned);
  }

  return urls;
}
