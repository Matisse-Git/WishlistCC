"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save, AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";
import { CurrencySelect } from "./ui/CurrencySelect";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "./ToastProvider";
import { formatDateTime } from "@/lib/dates";
import type { SerializedSettings } from "@/lib/settings";

interface RateInfo {
  fetchedAt: string;
  expiresAt: string;
}

export function SettingsForm({
  initialSettings,
  rateInfo,
}: {
  initialSettings: SerializedSettings;
  rateInfo: RateInfo | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [baseCurrency, setBaseCurrency] = useState(initialSettings.baseCurrency);
  const [goalAmount, setGoalAmount] = useState(initialSettings.goalAmount ?? "");
  const [savedAmount, setSavedAmount] = useState(initialSettings.savedAmount ?? "");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCurrency,
          goalAmount: goalAmount === "" ? null : Number(goalAmount),
          savedAmount: savedAmount === "" ? null : Number(savedAmount),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed to save settings");
      showToast("Settings saved.", "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshRates() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/rates/refresh", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to refresh exchange rates");
      showToast(`Exchange rates refreshed (${data.rateCount} currencies).`, "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to refresh exchange rates", "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/settings/reset", { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset data");
      showToast("All data has been reset.", "success");
      setConfirmReset(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset data", "error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <h2 className="font-medium text-slate-900">General</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base currency</label>
            <CurrencySelect value={baseCurrency} onChange={setBaseCurrency} className="w-full" />
            <p className="text-xs text-slate-500 mt-1">All totals and converted prices use this currency.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Savings goal amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount saved so far</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={savedAmount}
              onChange={(e) => setSavedAmount(e.target.value)}
              placeholder="e.g. 250"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-slate-900">Exchange rates</h2>
        {rateInfo ? (
          <p className="text-sm text-slate-500">
            Last fetched {formatDateTime(rateInfo.fetchedAt)} · expires{" "}
            {formatDateTime(rateInfo.expiresAt)}
          </p>
        ) : (
          <p className="text-sm text-slate-500">No rates cached yet for {baseCurrency}.</p>
        )}
        <Button variant="secondary" onClick={handleRefreshRates} loading={refreshing}>
          <RefreshCw className="h-4 w-4" />
          Refresh exchange rates
        </Button>
      </div>

      <div className="bg-white border border-red-200 rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-red-700 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </h2>
        <p className="text-sm text-slate-500">
          Permanently delete all items, labels, and cached exchange rates, and reset settings to defaults. This
          cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Reset all data
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This will permanently delete every wishlist item, bought item, and label, and reset your settings. This cannot be undone."
        confirmLabel="Reset everything"
        loading={resetting}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
