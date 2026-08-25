"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Decimal from "decimal.js";

interface VariantOverride {
  groupId: string | null;
  delta: Decimal;
}

interface VariantTotalsContextValue {
  /**
   * Records the price delta from optimistically switching one variant set's
   * selection, scoped to the item's group (or null if ungrouped). Setting
   * again for the same variantGroupId overwrites the previous delta rather
   * than stacking, since each delta is always computed against the same
   * server-confirmed baseline — see VariantCard.
   */
  setOverride: (variantGroupId: string, override: VariantOverride) => void;
  /** Drops a pending override once the server's own total already reflects it (or the switch failed/was undone). */
  clearOverride: (variantGroupId: string) => void;
  /** Sum of pending deltas — pass a groupId to scope to one group's total, omit to sum across every group. */
  getDelta: (groupId?: string | null) => Decimal;
}

const VariantTotalsContext = createContext<VariantTotalsContextValue | null>(null);

export function VariantTotalsProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, VariantOverride>>(new Map());

  const setOverride = useCallback((variantGroupId: string, override: VariantOverride) => {
    setOverrides((prev) => new Map(prev).set(variantGroupId, override));
  }, []);

  const clearOverride = useCallback((variantGroupId: string) => {
    setOverrides((prev) => {
      if (!prev.has(variantGroupId)) return prev;
      const next = new Map(prev);
      next.delete(variantGroupId);
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

  return <VariantTotalsContext.Provider value={value}>{children}</VariantTotalsContext.Provider>;
}

export function useVariantTotals() {
  const ctx = useContext(VariantTotalsContext);
  if (!ctx) throw new Error("useVariantTotals must be used within VariantTotalsProvider");
  return ctx;
}
