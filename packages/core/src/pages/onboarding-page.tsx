"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AVATAR_COLORS, type AvatarColor, useProfileStore } from "@workspace/core/stores/profile-store";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface OnboardingPageProps {
  onComplete: () => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { setProfile } = useProfileStore();
  const { resolvedTheme } = useTheme();
  const [name, setName] = useState("");
  const [color, setColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [error, setError] = useState("");

  const initials = name.trim()
    ? name.trim().slice(0, 2).toUpperCase()
    : "?";

  const handleStart = () => {
    if (!name.trim()) {
      setError("Lütfen bir kullanıcı adı girin.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Kullanıcı adı en az 2 karakter olmalıdır.");
      return;
    }
    setProfile(name.trim(), color);
    onComplete();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 p-2">
            <img
              src="/logo-light.png"
              alt="Passly"
              className={`size-full object-contain ${resolvedTheme === "dark" ? "brightness-0 invert" : ""}`}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Passly'e Hoş Geldiniz</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Şifrelerinizi güvenle saklayın. Başlamadan önce profilinizi ayarlayın.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <div
            className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg transition-colors duration-200"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="onboard-name">Kullanıcı Adı</Label>
            <Input
              id="onboard-name"
              placeholder="Adınızı girin"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              autoFocus
              maxLength={32}
            />
          </div>

          <div className="space-y-2">
            <Label>Profil Rengi</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-8 rounded-full transition-all duration-150",
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                      : "opacity-70 hover:opacity-100 hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button className="w-full" onClick={handleStart} size="lg">
            Başla
          </Button>
        </div>
      </div>
    </div>
  );
}
