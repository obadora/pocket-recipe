-- AlterTable
ALTER TABLE "meal_records" ADD COLUMN     "meal_time" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'ate';
