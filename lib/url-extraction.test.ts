import { describe, expect, it } from "vitest";
import { extractUrls } from "@/lib/url-extraction";

describe("extractUrls", () => {
  it("returns an empty array when there is no text", () => {
    expect(extractUrls(null)).toEqual([]);
    expect(extractUrls(undefined)).toEqual([]);
    expect(extractUrls("")).toEqual([]);
  });

  it("returns an empty array when the text has no URLs", () => {
    expect(extractUrls("We are hiring a Senior Frontend Engineer.")).toEqual([]);
  });

  it("extracts a single URL", () => {
    expect(extractUrls("Apply here: https://example.com/jobs/1")).toEqual([
      "https://example.com/jobs/1",
    ]);
  });

  it("extracts multiple distinct URLs", () => {
    const text = "Posting: https://dou.ua/jobs/1 Apply: https://example.com/apply?ref=dou";
    expect(extractUrls(text)).toEqual(["https://dou.ua/jobs/1", "https://example.com/apply?ref=dou"]);
  });

  it("removes duplicates while preserving first-seen order", () => {
    const text = "https://example.com/a https://example.com/b https://example.com/a";
    expect(extractUrls(text)).toEqual(["https://example.com/a", "https://example.com/b"]);
  });

  it("preserves query parameters", () => {
    const text = "https://example.com/jobs?id=42&ref=linkedin&utm_source=job_board";
    expect(extractUrls(text)).toEqual(["https://example.com/jobs?id=42&ref=linkedin&utm_source=job_board"]);
  });

  it("removes trailing punctuation that is not part of the URL", () => {
    const text = "See https://example.com/jobs/1, or https://example.com/jobs/2.";
    expect(extractUrls(text)).toEqual(["https://example.com/jobs/1", "https://example.com/jobs/2"]);
  });

  it("removes an unbalanced trailing closing parenthesis", () => {
    const text = "(the posting is at https://example.com/jobs/1)";
    expect(extractUrls(text)).toEqual(["https://example.com/jobs/1"]);
  });

  it("keeps a closing parenthesis that is part of a balanced URL", () => {
    const text = "https://example.com/wiki/Job_(role)";
    expect(extractUrls(text)).toEqual(["https://example.com/wiki/Job_(role)"]);
  });

  it("ignores unsafe or unsupported protocols", () => {
    const text = "javascript:alert(1) ftp://example.com/file mailto:jobs@example.com";
    expect(extractUrls(text)).toEqual([]);
  });

  it("only extracts the http/https portion when mixed with an unsupported scheme", () => {
    const text = "mailto:jobs@example.com and https://example.com/jobs/1";
    expect(extractUrls(text)).toEqual(["https://example.com/jobs/1"]);
  });
});
