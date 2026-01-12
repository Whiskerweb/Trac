/*
  Warnings:

  - The values [DUE,PROCESSING,PAID,CLAWBACK] on the enum `CommissionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CommissionStatus_new" AS ENUM ('PENDING', 'PROCEED', 'COMPLETE');
ALTER TABLE "public"."Commission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Commission" ALTER COLUMN "status" TYPE "CommissionStatus_new" USING ("status"::text::"CommissionStatus_new");
ALTER TYPE "CommissionStatus" RENAME TO "CommissionStatus_old";
ALTER TYPE "CommissionStatus_new" RENAME TO "CommissionStatus";
DROP TYPE "public"."CommissionStatus_old";
ALTER TABLE "Commission" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
