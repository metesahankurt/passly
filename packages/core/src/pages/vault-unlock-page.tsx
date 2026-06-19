"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useVaultStore } from "@workspace/core/stores/vault-store";

interface VaultUnlockPageProps {
  onUnlocked: () => void;
}

export function VaultUnlockPage({ onUnlocked }: VaultUnlockPageProps) {
  const { status, initialize, createVault, unlock } = useVaultStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isCreate = status === "empty";

  const handleSubmit = async () => {
    setError("");
    if (!password.trim()) {
      setError("Lütfen bir şifre girin.");
      return;
    }
    if (isCreate) {
      if (password.length < 8) {
        setError("Ana şifre en az 8 karakter olmalıdır.");
        return;
      }
      if (password !== confirm) {
        setError("Şifreler eşleşmiyor.");
        return;
      }
    }
    setLoading(true);
    try {
      if (isCreate) {
        await createVault(password);
      } else {
        await unlock(password);
      }
      onUnlocked();
    } catch {
      setError(isCreate ? "Vault oluşturulamadı." : "Yanlış şifre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            {isCreate ? (
              <ShieldCheck className="size-8 text-primary" />
            ) : (
              <Lock className="size-8 text-primary" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">
              {isCreate ? "Vault Oluştur" : "Vault'u Aç"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isCreate
                ? "Şifreleriniz AES-256-GCM ile şifrelenir."
                : "Devam etmek için ana şifrenizi girin."}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="master-pw">
              {isCreate ? "Ana Şifre" : "Şifre"}
            </Label>
            <div className="relative">
              <Input
                id="master-pw"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isCreate && handleSubmit()}
                className="pr-10 font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Şifreyi Onayla</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="font-mono"
              />
            </div>
          )}

          {isCreate && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              Ana şifrenizi unutursanız vault kurtarılamaz. Güvenli bir yerde saklayın.
            </p>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? isCreate
                ? "Oluşturuluyor…"
                : "Açılıyor…"
              : isCreate
              ? "Vault Oluştur"
              : "Aç"}
          </Button>
        </div>
      </div>
    </div>
  );
}
