import { describe, expect, it } from "vitest";
import { getUrlLabel } from "@/lib/url-labels";

describe("getUrlLabel", () => {
  it("labels dou.ua URLs as DOU", () => {
    expect(getUrlLabel("https://jobs.dou.ua/companies/acme/vacancies/1/")).toBe("DOU");
    expect(getUrlLabel("https://dou.ua/jobs/1")).toBe("DOU");
  });

  it("labels linkedin.com URLs as LinkedIn", () => {
    expect(getUrlLabel("https://www.linkedin.com/jobs/view/123")).toBe("LinkedIn");
    expect(getUrlLabel("https://linkedin.com/jobs/view/123")).toBe("LinkedIn");
  });

  it("labels known application-form domains as an application-form label", () => {
    expect(getUrlLabel("https://boards.greenhouse.io/acme/jobs/1")).toBe("Application form");
    expect(getUrlLabel("https://jobs.lever.co/acme/1")).toBe("Application form");
  });

  it("falls back to a readable hostname for an unknown domain", () => {
    expect(getUrlLabel("https://www.acme-careers.com/jobs/1")).toBe("acme-careers.com");
  });

  it("falls back to the raw URL if it cannot be parsed", () => {
    expect(getUrlLabel("not-a-url")).toBe("not-a-url");
  });
});
