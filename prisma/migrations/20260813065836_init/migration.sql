-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "goalAmount" DECIMAL,
    "savedAmount" DECIMAL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "originalPrice" DECIMAL,
    "originalCurrency" TEXT,
    "convertedPrice" DECIMAL,
    "baseCurrency" TEXT,
    "conversionStatus" TEXT NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL DEFAULT 'wishlist',
    "priority" TEXT,
    "store" TEXT,
    "notes" TEXT,
    "boughtAt" DATETIME,
    "boughtPrice" DECIMAL,
    "boughtCurrency" TEXT,
    "rawMetadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ItemLabel" (
    "itemId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    PRIMARY KEY ("itemId", "labelId"),
    CONSTRAINT "ItemLabel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExchangeRateCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseCurrency" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
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
