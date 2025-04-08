-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScrapedPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "crawlJobId" TEXT,
    "parentUrl" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "notes" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewed" DATETIME,
    "markdownContent" TEXT,
    CONSTRAINT "ScrapedPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScrapedPage_crawlJobId_fkey" FOREIGN KEY ("crawlJobId") REFERENCES "CrawlJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScrapedPage" ("category", "content", "createdAt", "id", "isFavorite", "lastViewed", "markdownContent", "metadata", "notes", "title", "updatedAt", "url", "userId", "viewCount") SELECT "category", "content", "createdAt", "id", "isFavorite", "lastViewed", "markdownContent", "metadata", "notes", "title", "updatedAt", "url", "userId", "viewCount" FROM "ScrapedPage";
DROP TABLE "ScrapedPage";
ALTER TABLE "new_ScrapedPage" RENAME TO "ScrapedPage";
CREATE UNIQUE INDEX "ScrapedPage_url_key" ON "ScrapedPage"("url");
CREATE INDEX "ScrapedPage_url_idx" ON "ScrapedPage"("url");
CREATE INDEX "ScrapedPage_userId_idx" ON "ScrapedPage"("userId");
CREATE INDEX "ScrapedPage_createdAt_idx" ON "ScrapedPage"("createdAt");
CREATE INDEX "ScrapedPage_crawlJobId_idx" ON "ScrapedPage"("crawlJobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
