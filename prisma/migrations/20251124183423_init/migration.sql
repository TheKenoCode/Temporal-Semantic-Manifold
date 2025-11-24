-- CreateTable
CREATE TABLE "Community" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeCommunity" (
    "nodeId" INTEGER NOT NULL,
    "communityId" INTEGER NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "NodeCommunity_pkey" PRIMARY KEY ("nodeId","communityId")
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Node_timestamp_idx" ON "Node"("timestamp");

-- CreateIndex
CREATE INDEX "Edge_sourceId_idx" ON "Edge"("sourceId");

-- CreateIndex
CREATE INDEX "Edge_targetId_idx" ON "Edge"("targetId");

-- CreateIndex
CREATE INDEX "Edge_createdAt_idx" ON "Edge"("createdAt");

-- AddForeignKey
ALTER TABLE "NodeCommunity" ADD CONSTRAINT "NodeCommunity_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeCommunity" ADD CONSTRAINT "NodeCommunity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
