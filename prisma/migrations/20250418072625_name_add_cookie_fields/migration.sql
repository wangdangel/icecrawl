-- AlterTable
ALTER TABLE "CrawlJob" ADD COLUMN "cookieString" TEXT;
ALTER TABLE "CrawlJob" ADD COLUMN "useCookies" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "Cookie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "cookieString" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cookie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Cookie_domain_idx" ON "Cookie"("domain");

-- CreateIndex
CREATE INDEX "Cookie_userId_idx" ON "Cookie"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cookie_domain_userId_key" ON "Cookie"("domain", "userId");
