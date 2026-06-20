"use client";

import { AVATAR_COLORS, useProfileStore } from "@workspace/core/stores/profile-store";
import { useTranslations } from "@workspace/i18n";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Check } from "lucide-react";
import { useState } from "react";

export function ProfileCard() {
  const { name, avatarColor, setProfile } = useProfileStore();
  const t = useTranslations("ProfileCard");
  const [editName, setEditName] = useState(name);
  const [editColor, setEditColor] = useState(avatarColor);
  const [saved, setSaved] = useState(false);

  const initials = editName ? editName.slice(0, 2).toUpperCase() : "?";

  const handleSave = () => {
    if (!editName.trim()) return;
    setProfile(editName.trim(), editColor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl font-bold text-lg text-white"
            style={{ backgroundColor: editColor }}
          >
            {initials}
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="profile-name">{t("nameLabel")}</Label>
            <Input
              id="profile-name"
              placeholder={t("namePlaceholder")}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("colorLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setEditColor(color)}
                className="relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              >
                {editColor === color && (
                  <Check className="size-4 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!editName.trim() || saved}
          className="w-full sm:w-auto"
        >
          {saved ? (
            <span className="flex items-center gap-1.5">
              <Check className="size-4" />
              {t("savedMessage")}
            </span>
          ) : (
            t("saveButton")
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
