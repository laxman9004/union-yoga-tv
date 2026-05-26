-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN "checkedInCount" INTEGER;
ALTER TABLE "ClassSession" ADD COLUMN "utilizationPercent" REAL;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "checkIns1Month" INTEGER;
ALTER TABLE "Member" ADD COLUMN "checkIns1Week" INTEGER;
ALTER TABLE "Member" ADD COLUMN "checkInsPeriod" INTEGER;
ALTER TABLE "Member" ADD COLUMN "lastCheckInAt" DATETIME;

-- AlterTable
ALTER TABLE "StudioConfig" ADD COLUMN "dataThroughDate" DATETIME;
ALTER TABLE "StudioConfig" ADD COLUMN "lastImportAt" DATETIME;
