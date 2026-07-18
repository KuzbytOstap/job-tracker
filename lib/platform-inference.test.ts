import { describe, expect, it } from "vitest";
import { Platform } from "@/app/generated/prisma/enums";
import { inferPlatformFromLink } from "@/lib/platform-inference";

describe("inferPlatformFromLink", () => {
  it("infers Djinni from a djinni.co URL", () => {
    expect(inferPlatformFromLink("https://djinni.co/jobs/123456/")).toBe(Platform.DJINNI);
  });

  it("infers DOU from a dou.ua URL", () => {
    expect(inferPlatformFromLink("https://jobs.dou.ua/companies/acme/vacancies/1/")).toBe(Platform.DOU);
  });

  it("infers LinkedIn from a linkedin.com URL", () => {
    expect(inferPlatformFromLink("https://www.linkedin.com/jobs/view/123")).toBe(Platform.LINKEDIN);
  });

  it("infers Robota.ua from a robota.ua URL", () => {
    expect(inferPlatformFromLink("https://robota.ua/company/acme/vacancy/1")).toBe(Platform.ROBOTA_UA);
  });

  it("matches supported subdomains", () => {
    expect(inferPlatformFromLink("https://jobs.dou.ua/vacancies/1/")).toBe(Platform.DOU);
    expect(inferPlatformFromLink("https://www.linkedin.com/jobs/view/123")).toBe(Platform.LINKEDIN);
  });

  it("returns null for an unknown hostname", () => {
    expect(inferPlatformFromLink("https://example.com/jobs/1")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(inferPlatformFromLink("not-a-url")).toBeNull();
  });

  it("does not match a lookalike hostname without the exact suffix", () => {
    expect(inferPlatformFromLink("https://fakedjinni.co/jobs")).toBeNull();
  });
});
