"use client";

import Decimal from "decimal.js";
import { useVariantTotals } from "./VariantTotalsProvider";
import { formatMoney, toDecimal } from "@/lib/money";

interface LiveMoneyValueProps {
  amount: string | null;
  currency?: string | null;
  /** Scope the live adjustment to one group's pending switches; omit to sum across every group (dashboard-wide totals). */
  groupId?: string | null;
}

/** A server-computed total, live-adjusted for any variant switches still in flight on this page — see VariantTotalsProvider. */
export function LiveMoneyValue({ amount, currency, groupId }: LiveMoneyValueProps) {
  const { getDelta } = useVariantTotals();
  const base = toDecimal(amount) ?? new Decimal(0);
  return <>{formatMoney(base.plus(getDelta(groupId)), currency)}</>;
}
