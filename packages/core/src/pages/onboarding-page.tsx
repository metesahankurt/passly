"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AVATAR_COLORS, type AvatarColor, useProfileStore } from "@workspace/core/stores/profile-store";
import { useLanguageSwitcher } from "@workspace/core/hooks/use-language-switcher";
import { localeConfig, routing } from "@workspace/i18n/routing";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { HardDrive, ShieldCheck, EyeOff, ArrowRight, Check } from "lucide-react";

interface OnboardingPageProps {
  onComplete: () => void;
}

const STEP_KEY = "passly_onboarding_step";

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { setProfile } = useProfileStore();
  const { resolvedTheme } = useTheme();
  const { locale, changeLanguage } = useLanguageSwitcher();
  const t = useTranslations("Onboarding");

  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingLocale, setPendingLocale] = useState(locale);

  const [name, setName] = useState("");
  const [color, setColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [error, setError] = useState("");

  // Restore step after locale-change page reload
  useEffect(() => {
    const saved = sessionStorage.getItem(STEP_KEY);
    if (saved) {
      sessionStorage.removeItem(STEP_KEY);
      setStep(Number(saved));
    }
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const goToStep = (next: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 280);
  };

  const handleLanguageContinue = () => {
    if (pendingLocale !== locale) {
      sessionStorage.setItem(STEP_KEY, "1");
      changeLanguage(pendingLocale);
    } else {
      goToStep(1);
    }
  };

  const handleStart = () => {
    if (!name.trim()) { setError(t("nameError")); return; }
    if (name.trim().length < 2) { setError(t("nameErrorShort")); return; }
    setProfile(name.trim(), color);
    onComplete();
  };

  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : "?";
  const vaultName = name.trim() ? `${name.trim()} Vault` : t("yourVault");

  const features = [
    { icon: HardDrive, title: t("featureLocal"), desc: t("featureLocalDesc"), color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: ShieldCheck, title: t("featureEncrypted"), desc: t("featureEncryptedDesc"), color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: EyeOff, title: t("featurePrivate"), desc: t("featurePrivateDesc"), color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div
        className="relative w-full max-w-lg"
        style={{
          opacity: mounted && !transitioning ? 1 : 0,
          transform: mounted && !transitioning ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
          transition: "opacity 0.32s ease, transform 0.32s ease",
        }}
      >
        {/* ── STEP 0: Language Selection ── */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Logo */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.7)",
                transition: "opacity 0.5s ease 0.1s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s",
              }}
            >
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <img
                  src="/logo-light.png"
                  alt="Passly"
                  className={`size-10 object-contain ${resolvedTheme === "dark" ? "brightness-0 invert" : ""}`}
                />
              </div>
            </div>

            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 0.45s ease 0.25s, transform 0.45s ease 0.25s",
              }}
            >
              <h1 className="text-2xl font-bold tracking-tight">Choose your language</h1>
              <p className="mt-1 text-sm text-muted-foreground">Dilinizi seçin · Selecciona tu idioma</p>
            </div>

            {/* Language grid */}
            <div
              className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.45s ease 0.38s, transform 0.45s ease 0.38s",
              }}
            >
              {routing.locales.map((loc) => {
                const cfg = localeConfig[loc as keyof typeof localeConfig];
                const isSelected = pendingLocale === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setPendingLocale(loc)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    <span className="text-xl">{cfg.flag}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cfg.nativeName}</p>
                    </div>
                    {isSelected && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div
              className="w-full"
              style={{
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.45s ease 0.52s",
              }}
            >
              <Button className="w-full" size="lg" onClick={handleLanguageContinue}>
                Continue
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Welcome ── */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-8 text-center">
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.7)",
                transition: "opacity 0.5s ease 0.05s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.05s",
              }}
            >
              <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 shadow-lg ring-1 ring-primary/20">
                <img
                  src="/logo-light.png"
                  alt="Passly"
                  className={`size-12 object-contain ${resolvedTheme === "dark" ? "brightness-0 invert" : ""}`}
                />
              </div>
            </div>

            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.5s ease 0.18s, transform 0.5s ease 0.18s",
              }}
            >
              <h1 className="text-3xl font-bold tracking-tight">{t("welcome")}</h1>
              <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
            </div>

            <div className="grid w-full grid-cols-3 gap-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(20px)",
                    transition: `opacity 0.5s ease ${0.32 + i * 0.12}s, transform 0.5s ease ${0.32 + i * 0.12}s`,
                  }}
                >
                  <div className={cn("flex size-10 items-center justify-center rounded-xl", f.bg)}>
                    <f.icon className={cn("size-5", f.color)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="w-full"
              style={{
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.5s ease 0.68s",
              }}
            >
              <Button className="w-full" size="lg" onClick={() => goToStep(2)}>
                {t("getStarted")}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Profile Setup ── */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">{t("createVault")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("createVaultSubtitle")}</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div
                className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg transition-colors duration-200"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <span className="text-xl font-semibold transition-all duration-200">
                {vaultName}
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-name">{t("nameLabel")}</Label>
                <Input
                  id="onboard-name"
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  autoFocus
                  maxLength={32}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("colorLabel")}</Label>
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
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => goToStep(1)}>
                  {t("backButton")}
                </Button>
                <Button className="flex-1" size="default" onClick={handleStart}>
                  {t("startButton")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
