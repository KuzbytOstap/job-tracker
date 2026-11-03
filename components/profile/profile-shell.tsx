"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverLetterSection } from "@/components/profile/cover-letter-section";
import { CvSection } from "@/components/profile/cv-section";
import { PersonalSection } from "@/components/profile/personal-section";
import { ProfileHeader } from "@/components/profile/profile-header";
import { SearchPreferencesSection } from "@/components/profile/search-preferences-section";
import { useT } from "@/components/i18n/i18n-provider";
import { useProfile } from "@/hooks/use-profile";

export function ProfileShell() {
  const t = useT();
  const profileQuery = useProfile();

  return (
    <div data-job-tracker-theme="game-hub" className="relative min-h-screen bg-[var(--gh-bg)]">
      <ProfileHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-6">
        {profileQuery.isPending ? (
          <div className="flex flex-col gap-6" aria-busy="true" aria-label={t("common.loading")}>
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : profileQuery.isError ? (
          <div role="alert" className="gh-form-surface flex flex-col items-start gap-3">
            <p className="text-sm text-[var(--gh-text)]">{t("profile.loadFailed")}</p>
            <Button type="button" variant="outline" onClick={() => profileQuery.refetch()}>
              {t("profile.retry")}
            </Button>
          </div>
        ) : (
          <>
            <PersonalSection profile={profileQuery.data} />
            <SearchPreferencesSection profile={profileQuery.data} />
            <CvSection profile={profileQuery.data} />
            <CoverLetterSection profile={profileQuery.data} />
          </>
        )}
      </main>
    </div>
  );
}
