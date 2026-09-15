-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN "goalId" TEXT,
ADD COLUMN "todoId" TEXT,
ADD COLUMN "bookId" TEXT;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "ReadingBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;
