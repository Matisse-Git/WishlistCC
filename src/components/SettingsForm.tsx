"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save, AlertTriangle, SlidersHorizontal, Target, Landmark } from "lucide-react";
import { Button } from "./ui/Button";
import { CurrencySelect } from "./ui/CurrencySelect";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Input, Label } from "./ui/Input";
import { SettingsSection } from "./ui/SettingsSection";
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
      <form onSubmit={handleSave}>
        <SettingsSection
          id="general"
          title="General"
          icon={SlidersHorizontal}
          description="Choose the currency used for totals and converted prices."
          footer={
            <Button type="submit" variant="primary" loading={saving}>
              <Save className="h-4 w-4" />
              Save settings
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="base-currency">Base currency</Label>
              <CurrencySelect id="base-currency" value={baseCurrency} onChange={setBaseCurrency} className="w-full" />
            </div>
          </div>

          <div className="grid gap-4 pt-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="goal-amount">
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  Savings goal amount
                </span>
              </Label>
              <Input
                id="goal-amount"
                type="number"
                min="0"
                step="0.01"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
            <div>
              <Label htmlFor="saved-amount">Amount saved so far</Label>
              <Input
                id="saved-amount"
                type="number"
                min="0"
                step="0.01"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
          </div>
        </SettingsSection>
      </form>

      <SettingsSection
        id="exchange-rates"
        title="Exchange rates"
        icon={Landmark}
        description="Rates are cached and refreshed on demand."
      >
        {rateInfo ? (
          <p className="text-sm text-muted-foreground">
            Last fetched {formatDateTime(rateInfo.fetchedAt)} · expires {formatDateTime(rateInfo.expiresAt)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No rates cached yet for {baseCurrency}.</p>
        )}
        <Button variant="secondary" onClick={handleRefreshRates} loading={refreshing}>
          <RefreshCw className="h-4 w-4" />
          Refresh exchange rates
        </Button>
      </SettingsSection>

      <SettingsSection
        id="danger-zone"
        title="Danger zone"
        icon={AlertTriangle}
        danger
        description="Permanently delete all items, labels, and cached exchange rates, and reset settings to defaults. This cannot be undone."
      >
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Reset all data
        </Button>
      </SettingsSection>

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
