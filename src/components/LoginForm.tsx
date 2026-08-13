"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { Button } from "./ui/Button";
import { Input, Label } from "./ui/Input";
import { Card } from "./ui/Card";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Incorrect password");
      }
      router.push(searchParams.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent-soft/60 to-background px-4">
      <Card padding="lg" className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-violet-500 text-white shadow-sm">
              <Gift className="h-5 w-5" />
            </span>
            <h1 className="mt-3 text-base font-semibold text-foreground">WishListCC</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the password to continue.</p>
          </div>

          <div>
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="Password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    </div>
  );
}
