import { prisma } from "./db";
import { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Deletes a VariantGroup row, tolerating it already being gone (e.g. a concurrent dissolve). */
async function deleteVariantGroupIfExists(tx: Tx, variantGroupId: string): Promise<void> {
  try {
    await tx.variantGroup.delete({ where: { id: variantGroupId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return;
    throw err;
  }
}

/**
 * Removes `itemId` from bookkeeping for `variantGroupId` — promoting a
 * sibling to selected if `itemId` was the selected one, and dissolving the
 * set entirely if fewer than two members would remain (a "set" of one
 * alternative isn't a choice anymore). Does not touch `itemId` itself; the
 * caller decides what happens to it (stays standalone, gets deleted, or
 * joins a different set).
 */
async function leaveVariantSet(tx: Tx, itemId: string, variantGroupId: string, wasSelected: boolean): Promise<void> {
  const siblings = await tx.item.findMany({
    where: { variantGroupId, NOT: { id: itemId } },
    orderBy: { createdAt: "asc" },
  });

  if (siblings.length === 0) {
    await deleteVariantGroupIfExists(tx, variantGroupId);
    return;
  }

  if (siblings.length === 1) {
    await tx.item.update({ where: { id: siblings[0].id }, data: { variantGroupId: null, isSelected: true } });
    await deleteVariantGroupIfExists(tx, variantGroupId);
    return;
  }

  if (wasSelected) {
    await tx.item.update({ where: { id: siblings[0].id }, data: { isSelected: true } });
  }
}

/**
 * Marks `itemId` as an alternative in the same variant set as `targetId`,
 * creating the set if `targetId` doesn't already have one. The new member
 * starts unselected (the existing choice is left in place) and is moved
 * into `targetId`'s group, since variants only make sense as alternatives
 * for the same slot.
 */
export async function attachVariant(itemId: string, targetId: string): Promise<void> {
  if (itemId === targetId) throw new Error("An item can't be a variant of itself.");

  await prisma.$transaction(async (tx) => {
    const [item, target] = await Promise.all([
      tx.item.findUnique({ where: { id: itemId } }),
      tx.item.findUnique({ where: { id: targetId } }),
    ]);
    if (!item) throw new Error("Item not found.");
    if (!target) throw new Error("Variant target not found.");

    let variantGroupId = target.variantGroupId;

    if (variantGroupId && variantGroupId === item.variantGroupId) return; // already in this set

    if (!variantGroupId) {
      const group = await tx.variantGroup.create({ data: {} });
      variantGroupId = group.id;
      await tx.item.update({ where: { id: targetId }, data: { variantGroupId, isSelected: true } });
    }

    if (item.variantGroupId) {
      await leaveVariantSet(tx, itemId, item.variantGroupId, item.isSelected);
    }

    await tx.item.update({
      where: { id: itemId },
      data: { variantGroupId, isSelected: false, groupId: target.groupId },
    });
  });
}

/** Removes `itemId` from its variant set (if any), leaving it as a standalone, fully-counted item. */
export async function detachVariant(itemId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itemId } });
    if (!item?.variantGroupId) return;
    await leaveVariantSet(tx, itemId, item.variantGroupId, item.isSelected);
    await tx.item.update({ where: { id: itemId }, data: { variantGroupId: null, isSelected: true } });
  });
}

/** Makes `itemId` the selected (price-counted) member of its variant set; no-op if it isn't part of one. */
export async function selectVariant(itemId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itemId } });
    if (!item?.variantGroupId) return;
    await tx.item.updateMany({
      where: { variantGroupId: item.variantGroupId, NOT: { id: itemId } },
      data: { isSelected: false },
    });
    await tx.item.update({ where: { id: itemId }, data: { isSelected: true } });
  });
}

/**
 * Deletes an item, first promoting a sibling to selected (and dissolving
 * the set if it would shrink to one member) when the item belongs to a
 * variant set — in the same transaction, so a crash mid-way can never leave
 * a sibling promoted while the item itself survives, or vice versa.
 */
export async function deleteItem(itemId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itemId } });
    if (!item) return;
    if (item.variantGroupId) {
      await leaveVariantSet(tx, itemId, item.variantGroupId, item.isSelected);
    }
    await tx.item.delete({ where: { id: itemId } });
  });
}

/**
 * Once one member of a variant set is actually bought, the choice is
 * resolved — dissolve the whole set so every member (bought or not) goes
 * back to being a plain, independently-counted item.
 */
export async function resolveSetOnPurchase(variantGroupId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.item.updateMany({ where: { variantGroupId }, data: { variantGroupId: null, isSelected: true } });
    await deleteVariantGroupIfExists(tx, variantGroupId);
  });
}
