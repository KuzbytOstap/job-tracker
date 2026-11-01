import { describe, expect, it } from "vitest";
import { applicationFormSchema } from "@/lib/application-form";
import { translateValidationMessage } from "@/lib/i18n/validation-keys";
import { createTranslator } from "@/lib/i18n/translate";
import { platformNameSchema } from "@/lib/platforms";

const en = createTranslator("en");
const uk = createTranslator("uk");

function firstMessage(result: { success: boolean; error?: { issues: Array<{ message: string }> } }): string {
  if (result.success || !result.error) throw new Error("expected a validation failure");
  return result.error.issues[0].message;
}

describe("translateValidationMessage", () => {
  it("translates known messages to Ukrainian", () => {
    expect(translateValidationMessage(uk, "Company is required")).toBe("Вкажіть компанію");
  });

  it("passes unknown messages through unchanged", () => {
    expect(translateValidationMessage(uk, "Something custom")).toBe("Something custom");
  });

  it("extracts the limit from the platform name length message", () => {
    expect(translateValidationMessage(uk, "Platform name must be at most 40 characters")).toContain("40");
  });

  it("covers every message produced by the real form and platform schemas", () => {
    const messages = [
      firstMessage(applicationFormSchema.shape.company.safeParse("")),
      firstMessage(applicationFormSchema.shape.position.safeParse("")),
      firstMessage(applicationFormSchema.shape.link.safeParse("ftp://example.com")),
      firstMessage(applicationFormSchema.shape.appliedAt.safeParse("")),
      firstMessage(platformNameSchema.safeParse("")),
      firstMessage(platformNameSchema.safeParse("x".repeat(41))),
      firstMessage(platformNameSchema.safeParse("!!!")),
    ];

    for (const message of messages) {
      expect(translateValidationMessage(en, message)).toBe(message);
      expect(translateValidationMessage(uk, message)).not.toBe(message);
    }
  });
});
