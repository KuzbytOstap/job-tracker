import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { Platform, Status } from "@/app/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

type StatusChangeSeed = {
  fromStatus: Status;
  toStatus: Status;
  changedAt: Date;
};

type ApplicationSeed = {
  company: string;
  position: string;
  platform: Platform;
  link?: string;
  status: Status;
  hasTestTask?: boolean;
  testTaskDone?: boolean;
  salaryExpectation?: string;
  notes?: string;
  appliedAt: Date;
  lastActivityAt: Date;
  statusHistory: StatusChangeSeed[];
};

const applications: ApplicationSeed[] = [
  {
    company: "Uklon",
    position: "Middle Frontend Developer",
    platform: Platform.DJINNI,
    link: "https://djinni.co/jobs/example-uklon-frontend",
    status: Status.APPLIED,
    salaryExpectation: "$2500-3000",
    appliedAt: daysAgo(0),
    lastActivityAt: daysAgo(0),
    statusHistory: [],
  },
  {
    company: "SoftServe",
    position: "React Developer",
    platform: Platform.DOU,
    link: "https://jobs.dou.ua/companies/softserve/vacancies/example",
    status: Status.HR_REPLIED,
    salaryExpectation: "$2800",
    notes: "Recruiter reached out, waiting for a call time.",
    appliedAt: daysAgo(6),
    lastActivityAt: daysAgo(2),
    statusHistory: [
      { fromStatus: Status.APPLIED, toStatus: Status.HR_REPLIED, changedAt: daysAgo(2) },
    ],
  },
  {
    company: "N-iX",
    position: "Frontend Engineer",
    platform: Platform.LINKEDIN,
    link: "https://www.linkedin.com/jobs/view/example-nix",
    status: Status.HR_CALL,
    notes: "Intro call scheduled for next week.",
    appliedAt: daysAgo(9),
    lastActivityAt: daysAgo(1),
    statusHistory: [
      { fromStatus: Status.APPLIED, toStatus: Status.HR_REPLIED, changedAt: daysAgo(5) },
      { fromStatus: Status.HR_REPLIED, toStatus: Status.HR_CALL, changedAt: daysAgo(1) },
    ],
  },
  {
    company: "EPAM",
    position: "Full Stack Developer",
    platform: Platform.ROBOTA_UA,
    link: "https://robota.ua/vacancy/example-epam",
    status: Status.TECH_INTERVIEW,
    hasTestTask: true,
    testTaskDone: true,
    salaryExpectation: "$3200",
    notes: "Completed the take-home task before the tech interview.",
    appliedAt: daysAgo(14),
    lastActivityAt: daysAgo(3),
    statusHistory: [
      { fromStatus: Status.APPLIED, toStatus: Status.HR_REPLIED, changedAt: daysAgo(11) },
      { fromStatus: Status.HR_REPLIED, toStatus: Status.HR_CALL, changedAt: daysAgo(9) },
      { fromStatus: Status.HR_CALL, toStatus: Status.TEST_TASK, changedAt: daysAgo(7) },
      { fromStatus: Status.TEST_TASK, toStatus: Status.TECH_INTERVIEW, changedAt: daysAgo(3) },
    ],
  },
  {
    company: "Grammarly",
    position: "Senior Frontend Engineer",
    platform: Platform.DIRECT,
    link: "https://www.grammarly.com/jobs/example",
    status: Status.OFFER,
    hasTestTask: true,
    testTaskDone: true,
    salaryExpectation: "$5500",
    notes: "Offer received, negotiating start date.",
    appliedAt: daysAgo(24),
    lastActivityAt: daysAgo(2),
    statusHistory: [
      { fromStatus: Status.APPLIED, toStatus: Status.HR_REPLIED, changedAt: daysAgo(21) },
      { fromStatus: Status.HR_REPLIED, toStatus: Status.HR_CALL, changedAt: daysAgo(19) },
      { fromStatus: Status.HR_CALL, toStatus: Status.TEST_TASK, changedAt: daysAgo(16) },
      { fromStatus: Status.TEST_TASK, toStatus: Status.TECH_INTERVIEW, changedAt: daysAgo(10) },
      { fromStatus: Status.TECH_INTERVIEW, toStatus: Status.OFFER, changedAt: daysAgo(2) },
    ],
  },
  {
    company: "BrightStart Labs",
    position: "React Native Developer",
    platform: Platform.OTHER,
    status: Status.REJECTED,
    salaryExpectation: "$2200",
    notes: "Rejected after the tech interview, team went with an internal candidate.",
    appliedAt: daysAgo(18),
    lastActivityAt: daysAgo(10),
    statusHistory: [
      { fromStatus: Status.APPLIED, toStatus: Status.HR_REPLIED, changedAt: daysAgo(15) },
      { fromStatus: Status.HR_REPLIED, toStatus: Status.TECH_INTERVIEW, changedAt: daysAgo(13) },
      { fromStatus: Status.TECH_INTERVIEW, toStatus: Status.REJECTED, changedAt: daysAgo(10) },
    ],
  },
  {
    company: "Ajax Systems",
    position: "Junior Frontend Developer",
    platform: Platform.DJINNI,
    link: "https://djinni.co/jobs/example-ajax-junior",
    status: Status.APPLIED,
    appliedAt: daysAgo(25),
    lastActivityAt: daysAgo(25),
    notes: "No response since applying, likely gone quiet.",
    statusHistory: [],
  },
];

const SEED_OWNER_EMAIL = "seed-owner@job-tracker.local";

async function main() {
  const seedOwner = await prisma.user.upsert({
    where: { email: SEED_OWNER_EMAIL },
    update: {},
    create: { email: SEED_OWNER_EMAIL, name: "Seed Owner" },
  });

  await prisma.statusChange.deleteMany();
  await prisma.jobApplication.deleteMany();

  for (const { statusHistory, ...applicationData } of applications) {
    const application = await prisma.jobApplication.create({
      data: { ...applicationData, userId: seedOwner.id },
    });

    if (statusHistory.length > 0) {
      await prisma.statusChange.createMany({
        data: statusHistory.map((change) => ({
          applicationId: application.id,
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          changedAt: change.changedAt,
        })),
      });
    }
  }

  console.log(`Seeded ${applications.length} job applications.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
