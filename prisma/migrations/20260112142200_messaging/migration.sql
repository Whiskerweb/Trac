-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('STARTUP', 'PARTNER');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "last_message" TEXT,
    "last_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unread_startup" INTEGER NOT NULL DEFAULT 0,
    "unread_partner" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "is_invitation" BOOLEAN NOT NULL DEFAULT false,
    "invitation_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_workspace_id_idx" ON "Conversation"("workspace_id");

-- CreateIndex
CREATE INDEX "Conversation_partner_id_idx" ON "Conversation"("partner_id");

-- CreateIndex
CREATE INDEX "Conversation_last_at_idx" ON "Conversation"("last_at");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_workspace_id_partner_id_key" ON "Conversation"("workspace_id", "partner_id");

-- CreateIndex
CREATE INDEX "Message_conversation_id_idx" ON "Message"("conversation_id");

-- CreateIndex
CREATE INDEX "Message_created_at_idx" ON "Message"("created_at");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
