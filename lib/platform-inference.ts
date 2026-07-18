import { Platform } from "@/app/generated/prisma/enums";

const HOSTNAME_PLATFORMS: Array<{ suffix: string; platform: Platform }> = [
  { suffix: "djinni.co", platform: Platform.DJINNI },
  { suffix: "dou.ua", platform: Platform.DOU },
  { suffix: "linkedin.com", platform: Platform.LINKEDIN },
  { suffix: "robota.ua", platform: Platform.ROBOTA_UA },
];

export function inferPlatformFromLink(link: string): Platform | null {
  let hostname: string;
  try {
    hostname = new URL(link).hostname.toLowerCase();
  } catch {
    return null;
  }

  for (const { suffix, platform } of HOSTNAME_PLATFORMS) {
    if (hostname === suffix || hostname.endsWith(`.${suffix}`)) {
      return platform;
    }
  }

  return null;
}
