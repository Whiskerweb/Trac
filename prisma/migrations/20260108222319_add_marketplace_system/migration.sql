-- CreateEnum
CREATE TYPE "MissionVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('YOUTUBE', 'PDF', 'LINK', 'TEXT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "gain_type" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "visibility" "MissionVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "MissionContent" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramRequest" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionContent_mission_id_idx" ON "MissionContent"("mission_id");

-- CreateIndex
CREATE INDEX "ProgramRequest_partner_id_idx" ON "ProgramRequest"("partner_id");

-- CreateIndex
CREATE INDEX "ProgramRequest_mission_id_idx" ON "ProgramRequest"("mission_id");

-- CreateIndex
CREATE INDEX "ProgramRequest_status_idx" ON "ProgramRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRequest_partner_id_mission_id_key" ON "ProgramRequest"("partner_id", "mission_id");

-- CreateIndex
CREATE INDEX "Mission_visibility_idx" ON "Mission"("visibility");

-- AddForeignKey
ALTER TABLE "MissionContent" ADD CONSTRAINT "MissionContent_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRequest" ADD CONSTRAINT "ProgramRequest_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRequest" ADD CONSTRAINT "ProgramRequest_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
