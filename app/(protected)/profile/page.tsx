import type { Metadata } from "next";
import { ProfileShell } from "@/components/profile/profile-shell";

export const metadata: Metadata = {
  title: "Profile · Job Tracker",
};

export default function ProfilePage() {
  return <ProfileShell />;
}
