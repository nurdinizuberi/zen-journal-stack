-- AlterTable
-- Adds personal-growth fields to JournalEntry. Existing rows receive a safe current timestamp.
ALTER TABLE "JournalEntry" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lifeArea" TEXT,
ADD COLUMN     "tags" JSONB DEFAULT '[]',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "goalId" TEXT,
ADD COLUMN     "lifeArea" TEXT,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium';

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lifeArea" TEXT,
ADD COLUMN     "milestones" JSONB DEFAULT '[]',
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetDate" TIMESTAMP(3),
ADD COLUMN     "whyItMatters" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "timeframe" SET DEFAULT 'monthly';

-- AlterTable
ALTER TABLE "ReadingBook" ADD COLUMN     "completedDate" TIMESTAMP(3),
ADD COLUMN     "goalId" TEXT,
ADD COLUMN     "keyIdeas" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lifeArea" TEXT,
ADD COLUMN     "reflection" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'reading';

-- CreateTable
CREATE TABLE "DailyIntention" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "intention" TEXT NOT NULL,
    "priority" TEXT,
    "desiredState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DailyIntention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyIntention_userId_idx" ON "DailyIntention"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyIntention_userId_date_key" ON "DailyIntention"("userId", "date");

-- CreateIndex
CREATE INDEX "Todo_userId_idx" ON "Todo"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingBook" ADD CONSTRAINT "ReadingBook_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyIntention" ADD CONSTRAINT "DailyIntention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;