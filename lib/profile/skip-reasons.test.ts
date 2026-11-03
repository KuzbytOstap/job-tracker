import { describe, expect, it } from "vitest";
import { createTranslator } from "@/lib/i18n/translate";
import { skipReasonMessageKey } from "@/lib/profile/skip-reasons";

const en = createTranslator("en");
const uk = createTranslator("uk");

describe("skipReasonMessageKey", () => {
  it("maps every reason the server can return to its own message", () => {
    expect(en(skipReasonMessageKey("AI_ACCESS_REQUIRED"))).toBe("AI access isn't approved yet.");
    expect(en(skipReasonMessageKey("AI_SUSPENDED"))).toBe("AI access is suspended.");
    expect(en(skipReasonMessageKey("PROFILE_LIMIT_REACHED"))).toBe("The daily profile AI limit is reached.");
    expect(en(skipReasonMessageKey("COVER_LETTER_LIMIT_REACHED"))).toBe("The daily cover letter limit is reached.");
    expect(en(skipReasonMessageKey("FIT_ANALYSIS_LIMIT_REACHED"))).toBe("The daily fit analysis limit is reached.");
    expect(en(skipReasonMessageKey("TOKEN_LIMIT_REACHED"))).toBe("The daily AI token limit is reached.");
    expect(en(skipReasonMessageKey("PROVIDER_FAILED"))).toBe("The AI service didn't respond. Try again later.");
    expect(en(skipReasonMessageKey("NO_CV_TEXT"))).toBe("Add the text of your primary CV first.");
    expect(en(skipReasonMessageKey("NO_VACANCY_TEXT"))).toBe("Add the vacancy text first.");
    expect(en(skipReasonMessageKey("CV_NOT_FOUND"))).toBe("This CV no longer exists.");
  });

  it("falls back to a generic message for an unknown or missing reason", () => {
    expect(en(skipReasonMessageKey("SOMETHING_NEW"))).toBe("AI couldn't process this right now.");
    expect(en(skipReasonMessageKey(null))).toBe("AI couldn't process this right now.");
  });

  it("has a Ukrainian message for each reason", () => {
    expect(uk(skipReasonMessageKey("PROFILE_LIMIT_REACHED"))).toBe("Досягнуто денний ліміт AI для профілю.");
    expect(uk(skipReasonMessageKey("COVER_LETTER_LIMIT_REACHED"))).toBe("Досягнуто денний ліміт листів.");
    expect(uk(skipReasonMessageKey("FIT_ANALYSIS_LIMIT_REACHED"))).toBe("Досягнуто денний ліміт аналізів відповідності.");
    expect(uk(skipReasonMessageKey("NO_VACANCY_TEXT"))).toBe("Спершу додайте текст вакансії.");
    expect(uk(skipReasonMessageKey(null))).toBe("AI зараз не може це обробити.");
  });
});
