"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Decimal from "decimal.js";

interface PendingTotalOverride {
  groupId: string | null;
  delta: Decimal;
}

interface LiveTotalsContextValue {
  /**
   * Records the price delta from an optimistic, not-yet-confirmed change
   * that affects a wishlist/group total — switching a variant set's
   * selection, or swapping an item's active price source — scoped to the
   * item's group (or null if ungrouped). `key` should be stable for the
   * thing being changed (a variantGroupId, an itemId, ...) so a repeated
   * change overwrites the previous delta rather than stacking, since each
   * delta is always computed against the same server-confirmed baseline —
   * see VariantCard and PriceSourceSwitcher.
   */
  setOverride: (key: string, override: PendingTotalOverride) => void;
  /** Drops a pending override once the server's own total already reflects it (or the change failed/was undone). */
  clearOverride: (key: string) => void;
  /** Sum of pending deltas — pass a groupId to scope to one group's total, omit to sum across every group. */
  getDelta: (groupId?: string | null) => Decimal;
}

const LiveTotalsContext = createContext<LiveTotalsContextValue | null>(null);

export function LiveTotalsProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, PendingTotalOverride>>(new Map());

  const setOverride = useCallback((key: string, override: PendingTotalOverride) => {
    setOverrides((prev) => new Map(prev).set(key, override));
  }, []);

  const clearOverride = useCallback((key: string) => {
    setOverrides((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const getDelta = useCallback(
    (groupId?: string | null) => {
      let sum = new Decimal(0);
      for (const override of overrides.values()) {
        if (groupId !== undefined && override.groupId !== groupId) continue;
        sum = sum.plus(override.delta);
      }
      return sum;
    },
    [overrides]
  );

  const value = useMemo(() => ({ setOverride, clearOverride, getDelta }), [setOverride, clearOverride, getDelta]);

  return <LiveTotalsContext.Provider value={value}>{children}</LiveTotalsContext.Provider>;
}

export function useLiveTotals() {
  const ctx = useContext(LiveTotalsContext);
  if (!ctx) throw new Error("useLiveTotals must be used within LiveTotalsProvider");
  return ctx;
}
