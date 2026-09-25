/*
  Warnings:

  - Added the required column `endsAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startsAt` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "endsAt" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "startsAt" TIMESTAMPTZ NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_turfId_startsAt_idx" ON "Booking"("turfId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");
