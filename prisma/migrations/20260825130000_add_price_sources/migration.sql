-- CreateTable
CREATE TABLE "PriceSource" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT,
    "store" TEXT,
    "originalPrice" DECIMAL(65,30),
    "originalCurrency" TEXT,
    "convertedPrice" DECIMAL(65,30),
    "baseCurrency" TEXT,
    "conversionStatus" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceSource_itemId_idx" ON "PriceSource"("itemId");

-- AddForeignKey
ALTER TABLE "PriceSource" ADD CONSTRAINT "PriceSource_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
