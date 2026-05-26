-- CreateTable
CREATE TABLE "StudioConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "studioAnniversaryDate" DATETIME NOT NULL DEFAULT '2025-01-03 00:00:00 +00:00',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastInitial" TEXT,
    "email" TEXT,
    "memberSinceDate" DATETIME,
    "birthday" DATETIME,
    "optOutFlag" BOOLEAN NOT NULL DEFAULT false,
    "lifetimeClassCount" INTEGER NOT NULL DEFAULT 0,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classType" TEXT NOT NULL,
    "instructorName" TEXT,
    "classroomName" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "capacity" INTEGER,
    "availableSpots" INTEGER,
    "waitlistCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "checkedInAt" DATETIME NOT NULL,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestFirstName" TEXT,
    CONSTRAINT "CheckIn_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NameBlocklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneratedCopy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inputsJson" TEXT,
    "validFor" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SceneToggle" (
    "sceneId" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CheckIn_memberId_idx" ON "CheckIn"("memberId");

-- CreateIndex
CREATE INDEX "CheckIn_classSessionId_idx" ON "CheckIn"("classSessionId");

-- CreateIndex
CREATE INDEX "CheckIn_checkedInAt_idx" ON "CheckIn"("checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "NameBlocklist_memberId_key" ON "NameBlocklist"("memberId");

-- CreateIndex
CREATE INDEX "GeneratedCopy_templateId_status_idx" ON "GeneratedCopy"("templateId", "status");

-- CreateIndex
CREATE INDEX "GeneratedCopy_validFor_idx" ON "GeneratedCopy"("validFor");
