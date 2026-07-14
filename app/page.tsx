import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function Home() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
