-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "goalAmount" DECIMAL(65,30),
    "savedAmount" DECIMAL(65,30),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "originalPrice" DECIMAL(65,30),
    "originalCurrency" TEXT,
    "convertedPrice" DECIMAL(65,30),
    "baseCurrency" TEXT,
    "conversionStatus" TEXT NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL DEFAULT 'wishlist',
    "priority" TEXT,
    "store" TEXT,
    "notes" TEXT,
    "boughtAt" TIMESTAMP(3),
    "boughtPrice" DECIMAL(65,30),
    "boughtCurrency" TEXT,
    "rawMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLabel" (
    "itemId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "ItemLabel_pkey" PRIMARY KEY ("itemId","labelId")
);

-- CreateTable
CREATE TABLE "ExchangeRateCache" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRateCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE INDEX "Item_createdAt_idx" ON "Item"("createdAt");

-- CreateIndex
CREATE INDEX "ItemLabel_labelId_idx" ON "ItemLabel"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateCache_baseCurrency_key" ON "ExchangeRateCache"("baseCurrency");

-- AddForeignKey
ALTER TABLE "ItemLabel" ADD CONSTRAINT "ItemLabel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLabel" ADD CONSTRAINT "ItemLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

