"use client";

import { MIN_MASTER_PASSWORD_LENGTH } from "@workspace/core/lib/vault-crypto";
import {
  useVaultStore,
  VaultPasswordChangeError,
} from "@workspace/core/stores/vault-store";
import { useTranslations } from "@workspace/i18n";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { KeyRound } from "lucide-react";
import { type SubmitEvent, useId, useRef, useState } from "react";

export function ChangeMasterPasswordCard() {
  const t = useTranslations("ChangeMasterPassword");
  const changeMasterPassword = useVaultStore(
    (state) => state.changeMasterPassword
  );
  const id = useId();
  const currentPasswordInput = useRef<HTMLInputElement>(null);
  const newPasswordInput = useRef<HTMLInputElement>(null);
  const confirmPasswordInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setError("");
    setSuccess(false);

    const form = event.currentTarget;
    const currentPassword = currentPasswordInput.current?.value ?? "";
    const newPassword = newPasswordInput.current?.value ?? "";
    if (newPassword !== confirmPasswordInput.current?.value) {
      setError(t("mismatch"));
      return;
    }

    setPending(true);
    try {
      await changeMasterPassword(currentPassword, newPassword);
      form.reset();
      setSuccess(true);
    } catch (cause) {
      if (cause instanceof VaultPasswordChangeError) {
        setError(t(cause.code));
      } else {
        setError(t("failed"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border bg-card p-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <KeyRound aria-hidden="true" className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-sm" id={`${id}-heading`}>
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-xs" id={`${id}-description`}>
            {t("description", { minimum: MIN_MASTER_PASSWORD_LENGTH })}
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-current`}>{t("currentPassword")}</Label>
          <Input
            autoComplete="current-password"
            disabled={pending}
            id={`${id}-current`}
            ref={currentPasswordInput}
            required
            type="password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-new`}>{t("newPassword")}</Label>
          <Input
            aria-describedby={`${id}-description`}
            autoComplete="new-password"
            disabled={pending}
            id={`${id}-new`}
            ref={newPasswordInput}
            required
            type="password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-confirm`}>{t("confirmPassword")}</Label>
          <Input
            autoComplete="new-password"
            disabled={pending}
            id={`${id}-confirm`}
            ref={confirmPasswordInput}
            required
            type="password"
          />
        </div>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <p className="text-muted-foreground text-sm" role="status">
          {success && t("success")}
        </p>
        <Button disabled={pending} type="submit">
          {pending ? t("pending") : t("submit")}
        </Button>
      </form>
    </section>
  );
}
