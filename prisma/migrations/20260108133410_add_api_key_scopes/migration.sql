-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STARTUP', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'BANNED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'DUE', 'PROCESSING', 'PAID', 'CLAWBACK');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "name" TEXT NOT NULL DEFAULT 'Default Key',
    "secret_hash" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['analytics:read', 'links:write']::TEXT[],

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "reward" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionEnrollment" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "link_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affiliate_id" TEXT,

    CONSTRAINT "ShortLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "description" TEXT,
    "secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount_cents" INTEGER,
    "net_cents" INTEGER,
    "stripe_fee" INTEGER,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "hit_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "user_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "stripe_connect_id" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "payouts_enabled_at" TIMESTAMP(3),
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProfile" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "bio" TEXT,
    "tiktok_url" TEXT,
    "instagram_url" TEXT,
    "twitter_url" TEXT,
    "youtube_url" TEXT,
    "website_url" TEXT,
    "profile_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "link_id" TEXT,
    "gross_amount" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "stripe_fee" INTEGER NOT NULL DEFAULT 0,
    "tax_amount" INTEGER NOT NULL DEFAULT 0,
    "commission_amount" INTEGER NOT NULL,
    "commission_rate" TEXT NOT NULL,
    "commission_type" "CommissionType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "matured_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "clawback_at" TIMESTAMP(3),
    "clawback_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBalance" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "due" INTEGER NOT NULL DEFAULT 0,
    "paid_total" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_public_key_key" ON "ApiKey"("public_key");

-- CreateIndex
CREATE INDEX "ApiKey_public_key_idx" ON "ApiKey"("public_key");

-- CreateIndex
CREATE INDEX "ApiKey_secret_hash_idx" ON "ApiKey"("secret_hash");

-- CreateIndex
CREATE INDEX "ApiKey_workspace_id_idx" ON "ApiKey"("workspace_id");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE INDEX "Mission_workspace_id_idx" ON "Mission"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "MissionEnrollment_link_id_key" ON "MissionEnrollment"("link_id");

-- CreateIndex
CREATE INDEX "MissionEnrollment_mission_id_idx" ON "MissionEnrollment"("mission_id");

-- CreateIndex
CREATE INDEX "MissionEnrollment_user_id_idx" ON "MissionEnrollment"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MissionEnrollment_mission_id_user_id_key" ON "MissionEnrollment"("mission_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShortLink_slug_key" ON "ShortLink"("slug");

-- CreateIndex
CREATE INDEX "ShortLink_affiliate_id_idx" ON "ShortLink"("affiliate_id");

-- CreateIndex
CREATE INDEX "ShortLink_slug_idx" ON "ShortLink"("slug");

-- CreateIndex
CREATE INDEX "ShortLink_workspace_id_idx" ON "ShortLink"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_workspace_id_idx" ON "WebhookEndpoint"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEvent_event_id_key" ON "ProcessedEvent"("event_id");

-- CreateIndex
CREATE INDEX "ProcessedEvent_event_id_idx" ON "ProcessedEvent"("event_id");

-- CreateIndex
CREATE INDEX "ProcessedEvent_workspace_id_idx" ON "ProcessedEvent"("workspace_id");

-- CreateIndex
CREATE INDEX "ProcessedEvent_processed_at_idx" ON "ProcessedEvent"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_owner_id_idx" ON "Workspace"("owner_id");

-- CreateIndex
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE INDEX "Domain_name_idx" ON "Domain"("name");

-- CreateIndex
CREATE INDEX "Domain_workspace_id_idx" ON "Domain"("workspace_id");

-- CreateIndex
CREATE INDEX "WorkspaceMember_user_id_idx" ON "WorkspaceMember"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspace_id_user_id_key" ON "WorkspaceMember"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "RateLimitHit_workspace_id_idx" ON "RateLimitHit"("workspace_id");

-- CreateIndex
CREATE INDEX "RateLimitHit_ip_address_idx" ON "RateLimitHit"("ip_address");

-- CreateIndex
CREATE INDEX "RateLimitHit_created_at_idx" ON "RateLimitHit"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_tenant_id_key" ON "Partner"("tenant_id");

-- CreateIndex
CREATE INDEX "Partner_email_idx" ON "Partner"("email");

-- CreateIndex
CREATE INDEX "Partner_tenant_id_idx" ON "Partner"("tenant_id");

-- CreateIndex
CREATE INDEX "Partner_user_id_idx" ON "Partner"("user_id");

-- CreateIndex
CREATE INDEX "Partner_program_id_idx" ON "Partner"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_program_id_email_key" ON "Partner"("program_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_partner_id_key" ON "PartnerProfile"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerProfile_partner_id_idx" ON "PartnerProfile"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_sale_id_key" ON "Commission"("sale_id");

-- CreateIndex
CREATE INDEX "Commission_partner_id_idx" ON "Commission"("partner_id");

-- CreateIndex
CREATE INDEX "Commission_program_id_idx" ON "Commission"("program_id");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Commission_created_at_idx" ON "Commission"("created_at");

-- CreateIndex
CREATE INDEX "Commission_sale_id_idx" ON "Commission"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerBalance_partner_id_key" ON "PartnerBalance"("partner_id");

-- CreateIndex
CREATE INDEX "PartnerBalance_partner_id_idx" ON "PartnerBalance"("partner_id");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionEnrollment" ADD CONSTRAINT "MissionEnrollment_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "ShortLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionEnrollment" ADD CONSTRAINT "MissionEnrollment_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortLink" ADD CONSTRAINT "ShortLink_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
