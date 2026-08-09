/**
 * One-off backfill: assign existing ownerless JobApplication rows to the
 * current single-user owner (identified by ALLOWED_EMAIL).
 *
 * Safe to run multiple times — only rows with `userId: null` are touched,
 * and a row that already has an owner is never overwritten.
 *
 * Preconditions:
 * - ALLOWED_EMAIL must be set.
 * - The owner must have already signed in at least once post-adapter-wiring,
 *   so their `User` row exists in the database.
 *
 * Usage: npm run db:backfill-owner
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const allowedEmail = process.env.ALLOWED_EMAIL;
  if (!allowedEmail) {
    console.error("Backfill aborted: ALLOWED_EMAIL is not set.");
    process.exitCode = 1;
    return;
  }

  const owner = await prisma.user.findUnique({ where: { email: allowedEmail } });
  if (!owner) {
    console.error(
      `Backfill aborted: no User found for ALLOWED_EMAIL (${allowedEmail}). ` +
        "The owner must sign in at least once before running this backfill.",
    );
    process.exitCode = 1;
    return;
  }

  const total = await prisma.jobApplication.count();
  const unowned = await prisma.jobApplication.count({ where: { userId: null } });

  const { count: updated } = await prisma.jobApplication.updateMany({
    where: { userId: null },
    data: { userId: owner.id },
  });

  const remainingUnowned = await prisma.jobApplication.count({ where: { userId: null } });

  console.log("Ownership backfill report:");
  console.log(`  owner:             ${owner.email} (${owner.id})`);
  console.log(`  total rows:        ${total}`);
  console.log(`  unowned (before):  ${unowned}`);
  console.log(`  updated:           ${updated}`);
  console.log(`  unowned (after):   ${remainingUnowned}`);

  if (remainingUnowned !== 0) {
    console.error(
      `Backfill incomplete: ${remainingUnowned} JobApplication row(s) still have no owner.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log("Backfill verified: zero JobApplication rows remain without an owner.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
