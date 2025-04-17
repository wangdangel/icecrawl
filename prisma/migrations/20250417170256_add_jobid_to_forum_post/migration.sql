-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ForumPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "meta" TEXT NOT NULL,
    "jobId" TEXT,
    CONSTRAINT "ForumPost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CrawlJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ForumPost" ("content", "id", "meta", "title", "url") SELECT "content", "id", "meta", "title", "url" FROM "ForumPost";
DROP TABLE "ForumPost";
ALTER TABLE "new_ForumPost" RENAME TO "ForumPost";
CREATE INDEX "ForumPost_jobId_idx" ON "ForumPost"("jobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
