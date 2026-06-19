"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AVATAR_COLORS, type AvatarColor, useProfileStore } from "@workspace/core/stores/profile-store";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { HardDrive, ShieldCheck, EyeOff, ArrowRight } from "lucide-react";

interface OnboardingPageProps {
  onComplete: () => void;
}

const features = [
  {
    icon: HardDrive,
    title: "Fully Local",
    desc: "No cloud, no servers. Your data stays on your device.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: ShieldCheck,
    title: "AES-256-GCM",
    desc: "Military-grade encryption protects every entry.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: EyeOff,
    title: "Zero Knowledge",
    desc: "No account needed. Only you have the key.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { setProfile } = useProfileStore();
  const { resolvedTheme } = useTheme();

  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [color, setColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
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

  const handleStart = () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (name.trim().length < 2) { setError("Name must be at least 2 characters."); return; }
    setProfile(name.trim(), color);
    onComplete();
  };

  const initials = name.trim() ? name.trim().slice(0, 2).toUpperCase() : "?";
  const vaultName = name.trim() ? `${name.trim()} Vault` : "Your Vault";

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
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-8 text-center">
            {/* Logo */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.7)",
                transition: "opacity 0.5s ease 0.1s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s",
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

            {/* Title */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s",
              }}
            >
              <h1 className="text-3xl font-bold tracking-tight">Welcome to Passly</h1>
              <p className="mt-2 text-muted-foreground">
                Your passwords, encrypted and local. Forever.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid w-full grid-cols-3 gap-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(20px)",
                    transition: `opacity 0.5s ease ${0.4 + i * 0.12}s, transform 0.5s ease ${0.4 + i * 0.12}s`,
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

            {/* CTA */}
            <div
              className="w-full"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.5s ease 0.72s, transform 0.5s ease 0.72s",
              }}
            >
              <Button className="w-full" size="lg" onClick={() => goToStep(1)}>
                Get Started
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1: Profile Setup */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Create Your Vault</h1>
              <p className="mt-1 text-sm text-muted-foreground">Set up your profile to continue</p>
            </div>

            {/* Live preview */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg transition-colors duration-200"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold transition-all duration-200">
                  {vaultName}
                </span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-name">Your Name</Label>
                <Input
                  id="onboard-name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  autoFocus
                  maxLength={32}
                />
              </div>

              <div className="space-y-2">
                <Label>Profile Color</Label>
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => goToStep(0)}
                >
                  Back
                </Button>
                <Button className="flex-1" onClick={handleStart} size="default">
                  Create My Vault
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
