-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "creditApplied" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestedSlots" TIMESTAMPTZ[],
ADD COLUMN     "rescheduleOfId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_userId_startsAt_idx" ON "Booking"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_rescheduleOfId_idx" ON "Booking"("rescheduleOfId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rescheduleOfId_fkey" FOREIGN KEY ("rescheduleOfId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
