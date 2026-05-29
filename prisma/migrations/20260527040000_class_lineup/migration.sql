-- CreateTable
CREATE TABLE "ClassLineup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classSessionId" TEXT NOT NULL,
    "validFor" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassLineup_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassLineupItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineupId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "sceneKey" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subline" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "payloadJson" TEXT NOT NULL,
    CONSTRAINT "ClassLineupItem_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "ClassLineup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassLineup_classSessionId_validFor_key" ON "ClassLineup"("classSessionId", "validFor");

-- CreateIndex
CREATE INDEX "ClassLineup_validFor_status_idx" ON "ClassLineup"("validFor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLineupItem_lineupId_itemKey_key" ON "ClassLineupItem"("lineupId", "itemKey");
