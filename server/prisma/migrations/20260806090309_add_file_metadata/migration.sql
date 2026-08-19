-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "coverLetterFileName" TEXT,
ADD COLUMN     "coverLetterFileSize" INTEGER,
ADD COLUMN     "coverLetterPublicId" TEXT,
ADD COLUMN     "coverLetterUploadedAt" TIMESTAMP(3),
ADD COLUMN     "cvFileSize" INTEGER,
ADD COLUMN     "cvPublicId" TEXT,
ADD COLUMN     "cvUploadedAt" TIMESTAMP(3);
