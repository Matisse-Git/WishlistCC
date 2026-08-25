-- CreateTable
CREATE TABLE "VariantGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "variantGroupId" TEXT,
ADD COLUMN "isSelected" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Item_variantGroupId_idx" ON "Item"("variantGroupId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "VariantGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
