import { getUrlLabel } from "@/lib/url-labels";
import type { Translator } from "@/lib/i18n/translate";

const APPLICATION_FORM_LABEL = "Application form";

export function getTranslatedUrlLabel(t: Translator, url: string): string {
  const label = getUrlLabel(url);
  return label === APPLICATION_FORM_LABEL ? t("source.applicationForm") : label;
}
