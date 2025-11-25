-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "generatedFrom" TEXT,
ADD COLUMN     "isGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "generatedFrom" TEXT;

-- CreateIndex
CREATE INDEX "Community_generatedFrom_idx" ON "Community"("generatedFrom");

-- CreateIndex
CREATE INDEX "Community_isGenerated_idx" ON "Community"("isGenerated");

-- CreateIndex
CREATE INDEX "Node_generatedFrom_idx" ON "Node"("generatedFrom");
