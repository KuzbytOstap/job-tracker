import { Platform } from "@/app/generated/prisma/enums";
import type {
  ApplicationExtractionInput,
  ApplicationExtractionResult,
} from "@/lib/application-extraction";
import type { ApplicationExtractionProvider } from "@/lib/ai/application-extraction-provider";

const DEFAULT_MOCK_DELAY_MS = 0;
const MAX_MOCK_DELAY_MS = 5_000;

function completeFixture(): ApplicationExtractionResult {
  return {
    company: "Acme Robotics",
    position: "Senior Frontend Engineer",
    platform: Platform.OTHER,
    link: "https://example.com/careers/senior-frontend-engineer",
    salaryExpectation: "$4000-5000",
    notes:
      "Remote role focused on a React/TypeScript design system. Team of six, async-first culture. Requires 5+ years of frontend experience.",
  };
}

function partialFixture(): ApplicationExtractionResult {
  return {
    company: "Nimbus Analytics",
    position: null,
    platform: null,
    link: null,
    salaryExpectation: null,
    notes: null,
  };
}

function linkedinFixture(): ApplicationExtractionResult {
  return {
    company: "Northwind Software",
    position: "Product Engineer",
    platform: Platform.LINKEDIN,
    link: "https://www.linkedin.com/jobs/view/1234567890",
    salaryExpectation: "$90,000-110,000",
    notes: "Posted via LinkedIn. Hybrid role, three days on-site per week.",
  };
}

function djinniFixture(): ApplicationExtractionResult {
  return {
    company: "Kyiv Dev Studio",
    position: "Middle Backend Engineer",
    platform: Platform.DJINNI,
    link: "https://djinni.co/jobs/123456-middle-backend-engineer/",
    salaryExpectation: "$3000-4000",
    notes: "Sourced through Djinni. Node.js and PostgreSQL stack, small team.",
  };
}

function douFixture(): ApplicationExtractionResult {
  return {
    company: "Lviv IT Company",
    position: "React Developer",
    platform: Platform.DOU,
    link: "https://jobs.dou.ua/companies/lviv-it-company/vacancies/123456/",
    salaryExpectation: "$2500-3500",
    notes: "Found on DOU. On-site preferred, relocation assistance offered.",
  };
}

const FIXTURE_MARKERS: Record<string, () => ApplicationExtractionResult> = {
  "[mock:complete]": completeFixture,
  "[mock:partial]": partialFixture,
  "[mock:linkedin]": linkedinFixture,
  "[mock:djinni]": djinniFixture,
  "[mock:dou]": douFixture,
};

const ERROR_MARKER = "[mock:error]";

function resolveMockDelayMs(): number {
  const raw = process.env.AI_MOCK_DELAY_MS;
  if (!raw) return DEFAULT_MOCK_DELAY_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_MOCK_DELAY_MS;

  return Math.min(parsed, MAX_MOCK_DELAY_MS);
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockApplicationExtractionProvider implements ApplicationExtractionProvider {
  readonly name = "mock";

  async extractApplication(
    input: ApplicationExtractionInput,
  ): Promise<ApplicationExtractionResult> {
    await delay(resolveMockDelayMs());

    if (input.jobPostingText.includes(ERROR_MARKER)) {
      throw new Error("Mock extraction failure");
    }

    for (const [marker, buildFixture] of Object.entries(FIXTURE_MARKERS)) {
      if (input.jobPostingText.includes(marker)) {
        return buildFixture();
      }
    }

    return completeFixture();
  }
}
