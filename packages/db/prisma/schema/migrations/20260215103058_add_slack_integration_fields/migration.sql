-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "enableSlackNotification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyOnlyOnFailure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slackNotificationChannelId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "slackBotToken" TEXT,
ADD COLUMN     "slackConnectedAt" TIMESTAMP(3),
ADD COLUMN     "slackConnectedById" TEXT,
ADD COLUMN     "slackTeamId" TEXT,
ADD COLUMN     "slackTeamName" TEXT;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_slackConnectedById_fkey" FOREIGN KEY ("slackConnectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
