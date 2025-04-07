-- AlterTable
ALTER TABLE "ScrapedPage" ADD COLUMN "markdownContent" TEXT;

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "error" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "options" TEXT,
    "failedUrls" TEXT,
    "processedUrls" INTEGER NOT NULL DEFAULT 0,
    "foundUrls" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CrawlJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CrawlJob_status_idx" ON "CrawlJob"("status");

-- CreateIndex
CREATE INDEX "CrawlJob_userId_idx" ON "CrawlJob"("userId");

-- CreateIndex
CREATE INDEX "CrawlJob_createdAt_idx" ON "CrawlJob"("createdAt");
