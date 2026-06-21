"use client";

import {
  type BrowserImportEntry,
  parseBrowserCSV,
} from "@workspace/core/lib/browser-import";
import type { VaultEntry } from "@workspace/core/lib/vault-crypto";
import { useCategoriesStore } from "@workspace/core/stores/categories-store";
import { useVaultStore } from "@workspace/core/stores/vault-store";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import {
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  KeyRound,
  LayoutGrid,
  List,
  Lock,
  Mail,
  NotebookText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Character sets ───────────────────────────────────────────────────────────

const CHARS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

const URL_PROTOCOL_REGEX = /^https?:\/\//;
const TRAILING_SLASH_REGEX = /\/$/;

type TauriWindow = Window &
  typeof globalThis & {
    __TAURI_INTERNALS__?: {
      invoke: (command: string, args: { url: string }) => Promise<unknown>;
    };
  };

type VaultItemType = "password" | "card";
type ViewMode = "grid" | "compact" | "list";

const VIEW_MODE_STORAGE_KEY = "passly:vault-view-mode";
const VIEW_MODE_OPTIONS = [
  { icon: LayoutGrid, label: "Grid", value: "grid" },
  { icon: LayoutGrid, label: "Compact", value: "compact" },
  { icon: List, label: "List", value: "list" },
] as const;

const CARD_BRANDS: Array<{
  cvcLength: number[];
  lengths: number[];
  name: string;
  pattern: RegExp;
}> = [
  {
    name: "Visa",
    pattern: /^4/,
    lengths: [13, 16, 19],
    cvcLength: [3],
  },
  {
    name: "Mastercard",
    pattern: /^(5[1-5]|2[2-7])/,
    lengths: [16],
    cvcLength: [3],
  },
  {
    name: "American Express",
    pattern: /^3[47]/,
    lengths: [15],
    cvcLength: [4],
  },
  {
    name: "Discover",
    pattern: /^(6011|65|64[4-9])/,
    lengths: [16, 19],
    cvcLength: [3],
  },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return onlyDigits(value)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function detectCardBrand(number: string) {
  const digits = onlyDigits(number);
  return CARD_BRANDS.find(
    (brand) =>
      brand.pattern.test(digits) && brand.lengths.includes(digits.length)
  );
}

function isValidLuhn(number: string) {
  const digits = onlyDigits(number);
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return digits.length > 0 && sum % 10 === 0;
}

function isValidExpiry(month: string, year: string) {
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return false;
  }
  if (!Number.isInteger(parsedYear) || parsedYear < 2000) {
    return false;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return (
    parsedYear > currentYear ||
    (parsedYear === currentYear && parsedMonth >= currentMonth)
  );
}

function getEntryType(entry: VaultEntry): VaultItemType {
  return entry.itemType === "card" ? "card" : "password";
}

function entropy(password: string): number {
  const unique = new Set(password.split("")).size;
  if (!(unique && password.length)) {
    return 0;
  }
  return password.length * Math.log2(unique);
}

function strengthLabel(bits: number): {
  label: string;
  color: string;
  width: string;
} {
  if (bits < 28) {
    return { label: "Çok Zayıf", color: "bg-red-500", width: "w-[15%]" };
  }
  if (bits < 40) {
    return { label: "Zayıf", color: "bg-orange-500", width: "w-[30%]" };
  }
  if (bits < 55) {
    return { label: "Orta", color: "bg-yellow-500", width: "w-[50%]" };
  }
  if (bits < 70) {
    return { label: "İyi", color: "bg-lime-500", width: "w-[75%]" };
  }
  return { label: "Güçlü", color: "bg-emerald-500", width: "w-full" };
}

function OptionPill({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "select-none rounded-full border px-3 py-1 font-medium text-xs transition-colors",
        checked && !disabled
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-transparent bg-muted/60 text-muted-foreground",
        disabled && "cursor-not-allowed opacity-40"
      )}
      onClick={() => !disabled && onChange(!checked)}
      type="button"
    >
      {label}
    </button>
  );
}

// ─── Password Generator ───────────────────────────────────────────────────────

function PasswordGenerator({ onUse }: { onUse: (pw: string) => void }) {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const activeCount = [useUpper, useLower, useDigits, useSymbols].filter(
    Boolean
  ).length;

  const generate = useCallback(() => {
    const pool = [
      useUpper ? CHARS.upper : "",
      useLower ? CHARS.lower : "",
      useDigits ? CHARS.digits : "",
      useSymbols ? CHARS.symbols : "",
    ].join("");
    if (!pool) {
      return;
    }
    const guaranteed: string[] = [];
    if (useUpper) {
      guaranteed.push(
        CHARS.upper[Math.floor(Math.random() * CHARS.upper.length)] as string
      );
    }
    if (useLower) {
      guaranteed.push(
        CHARS.lower[Math.floor(Math.random() * CHARS.lower.length)] as string
      );
    }
    if (useDigits) {
      guaranteed.push(
        CHARS.digits[Math.floor(Math.random() * CHARS.digits.length)] as string
      );
    }
    if (useSymbols) {
      guaranteed.push(
        CHARS.symbols[
          Math.floor(Math.random() * CHARS.symbols.length)
        ] as string
      );
    }
    const rest = Array.from(
      { length: length - guaranteed.length },
      () => pool[Math.floor(Math.random() * pool.length)]
    );
    const all = [...guaranteed, ...rest];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setGenerated(all.join(""));
    setCopied(false);
  }, [length, useUpper, useLower, useDigits, useSymbols]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    if (!generated) {
      return;
    }
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bits = entropy(generated);
  const strength = strengthLabel(bits);

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 shrink-0 text-primary" />
        <span className="font-semibold text-sm">Şifre Üretici</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 select-all overflow-hidden truncate whitespace-nowrap rounded-lg border bg-background px-3 py-2 font-mono text-sm tracking-widest">
          {generated || "—"}
        </div>
        <button
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
        <button
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={generate}
          type="button"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              strength.color,
              strength.width
            )}
          />
        </div>
        <p
          className={cn(
            "font-medium text-[11px]",
            strength.color.replace("bg-", "text-")
          )}
        >
          {strength.label}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Uzunluk</span>
          <span className="font-mono font-semibold text-xs tabular-nums">
            {length}
          </span>
        </div>
        <input
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          max={64}
          min={8}
          onChange={(e) => setLength(Number(e.target.value))}
          type="range"
          value={length}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>8</span>
          <span>64</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <OptionPill
          checked={useUpper}
          disabled={activeCount === 1 && useUpper}
          label="A–Z"
          onChange={setUseUpper}
        />
        <OptionPill
          checked={useLower}
          disabled={activeCount === 1 && useLower}
          label="a–z"
          onChange={setUseLower}
        />
        <OptionPill
          checked={useDigits}
          disabled={activeCount === 1 && useDigits}
          label="0–9"
          onChange={setUseDigits}
        />
        <OptionPill
          checked={useSymbols}
          disabled={activeCount === 1 && useSymbols}
          label="!@#…"
          onChange={setUseSymbols}
        />
      </div>
      <Button
        className="w-full"
        disabled={!generated}
        onClick={() => generated && onUse(generated)}
        size="sm"
        type="button"
      >
        Bu şifreyi kullan
      </Button>
    </div>
  );
}

// ─── Category Combobox ────────────────────────────────────────────────────────

function CategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const { categories } = useCategoriesStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? categories.filter((c) => c.toLowerCase().includes(value.toLowerCase()))
    : categories;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          autoComplete="off"
          className="pr-8"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="örn. Oyun, Banka, E-posta"
          value={value}
        />
        <ChevronDown
          className={cn(
            "absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </div>

      {open && categories.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 shadow-md">
          {filtered.map((cat) => (
            <button
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                value === cat && "bg-accent/50 font-medium"
              )}
              key={cat}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(cat);
                setOpen(false);
              }}
              type="button"
            >
              <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

function SelectionToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      aria-label={checked ? "Seçimi kaldır" : "Seç"}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:bg-muted"
      )}
      onClick={onChange}
      type="button"
    >
      {checked && <Check className="size-3.5" />}
    </button>
  );
}

// ─── Password Form ────────────────────────────────────────────────────────────

type FormValues = Omit<VaultEntry, "id" | "createdAt" | "updatedAt">;

function PasswordForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<FormValues>({
    itemType: "password",
    title: initial?.title ?? "",
    username: initial?.username ?? "",
    password: initial?.password ?? "",
    url: initial?.url ?? "",
    notes: initial?.notes ?? "",
    category: initial?.category ?? "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!values.title.trim()) {
      setError("Başlık zorunludur.");
      return;
    }
    if (!values.password.trim()) {
      setError("Şifre zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div className="space-y-1.5">
          <Label htmlFor="f-title">
            Başlık <span className="text-destructive">*</span>
          </Label>
          <Input
            autoFocus
            id="f-title"
            onChange={set("title")}
            placeholder="örn. GitHub, Google, Netflix"
            value={values.title}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-username">
            E-posta / Kullanıcı adı
            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
              opsiyonel
            </span>
          </Label>
          <Input
            id="f-username"
            onChange={set("username")}
            placeholder="john@example.com"
            value={values.username}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="f-password">
              Şifre <span className="text-destructive">*</span>
            </Label>
            <button
              className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-primary"
              onClick={() => setShowGenerator((v) => !v)}
              type="button"
            >
              <Wand2 className="size-3.5" />
              {showGenerator ? "Gizle" : "Üret"}
            </button>
          </div>
          <div className="relative">
            <Input
              className="pr-10 font-mono"
              id="f-password"
              onChange={set("password")}
              placeholder="Şifrenizi girin veya yapıştırın"
              type={showPw ? "text" : "password"}
              value={values.password}
            />
            <button
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              type="button"
            >
              {showPw ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {showGenerator && (
            <PasswordGenerator
              onUse={(pw) => {
                setValues((v) => ({ ...v, password: pw }));
                setShowPw(true);
                setShowGenerator(false);
              }}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-url">
            URL
            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
              opsiyonel
            </span>
          </Label>
          <Input
            id="f-url"
            onChange={set("url")}
            placeholder="https://example.com"
            value={values.url}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-category">
            Kategori
            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
              opsiyonel
            </span>
          </Label>
          <CategoryCombobox
            onChange={(val) => setValues((v) => ({ ...v, category: val }))}
            value={values.category}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-notes">
            Notlar
            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
              opsiyonel
            </span>
          </Label>
          <Textarea
            className="resize-none"
            id="f-notes"
            onChange={set("notes")}
            placeholder="Kurtarma kodları, güvenlik soruları…"
            rows={3}
            value={values.notes}
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </p>
        )}
      </div>

      <DialogFooter className="mt-4 border-t pt-4">
        <DialogClose asChild>
          <Button disabled={saving} type="button" variant="outline">
            İptal
          </Button>
        </DialogClose>
        <Button disabled={saving} onClick={handleSubmit} type="button">
          {saving ? "Kaydediliyor…" : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Card validation and preview state stay together so invalid card data cannot be submitted.
function CardForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<FormValues>({
    itemType: "card",
    title: initial?.title ?? "",
    username: "",
    password: "",
    url: "",
    notes: initial?.notes ?? "",
    category: initial?.category ?? "",
    cardholderName: initial?.cardholderName ?? "",
    cardNumber: initial?.cardNumber ?? "",
    cardBrand: initial?.cardBrand ?? "",
    expiryMonth: initial?.expiryMonth ?? "",
    expiryYear: initial?.expiryYear ?? "",
    cvc: initial?.cvc ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const brand = detectCardBrand(values.cardNumber ?? "");
  const cardDigits = onlyDigits(values.cardNumber ?? "");
  const cvcDigits = onlyDigits(values.cvc ?? "");

  const set =
    (field: keyof FormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async () => {
    const cardNumber = onlyDigits(values.cardNumber ?? "");
    const detectedBrand = detectCardBrand(cardNumber);

    if (!values.title.trim()) {
      setError("Kart başlığı zorunludur.");
      return;
    }
    if (!values.cardholderName?.trim()) {
      setError("Kart sahibi zorunludur.");
      return;
    }
    if (!(detectedBrand && isValidLuhn(cardNumber))) {
      setError("Geçerli bir kart numarası girin.");
      return;
    }
    if (!isValidExpiry(values.expiryMonth ?? "", values.expiryYear ?? "")) {
      setError("Geçerli bir son kullanma tarihi girin.");
      return;
    }
    if (!detectedBrand.cvcLength.includes(cvcDigits.length)) {
      setError(`${detectedBrand.name} için geçerli bir CVC girin.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit({
        ...values,
        itemType: "card",
        username: "",
        password: "",
        url: "",
        cardNumber,
        cardBrand: detectedBrand.name,
        cvc: cvcDigits,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm">{values.title || "Kart"}</p>
              <p className="mt-1 font-mono text-muted-foreground text-sm tracking-wider">
                {formatCardNumber(cardDigits) || "•••• •••• •••• ••••"}
              </p>
            </div>
            <span className="rounded-md border bg-background px-2 py-1 font-semibold text-xs">
              {brand?.name ?? "Kart"}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">
                Kart sahibi
              </p>
              <p className="mt-1 truncate font-medium text-sm">
                {values.cardholderName || "Ad Soyad"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase">
                Son kullanım
              </p>
              <p className="mt-1 font-mono text-sm">
                {values.expiryMonth || "MM"}/
                {values.expiryYear?.slice(-2) || "YY"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-title">
            Başlık <span className="text-destructive">*</span>
          </Label>
          <Input
            autoFocus
            id="card-title"
            onChange={set("title")}
            placeholder="örn. Garanti Bonus"
            value={values.title}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-holder">
            Kart sahibi <span className="text-destructive">*</span>
          </Label>
          <Input
            id="card-holder"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                cardholderName: event.target.value.toUpperCase(),
              }))
            }
            placeholder="AD SOYAD"
            value={values.cardholderName}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-number">
            Kart numarası <span className="text-destructive">*</span>
          </Label>
          <Input
            className="font-mono tracking-wider"
            id="card-number"
            inputMode="numeric"
            maxLength={23}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                cardNumber: formatCardNumber(event.target.value),
              }))
            }
            placeholder="4242 4242 4242 4242"
            value={formatCardNumber(values.cardNumber ?? "")}
          />
          <p className="text-muted-foreground text-xs">
            Kart numarası Luhn algoritması ve kart türü ile doğrulanır.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="card-month">Ay</Label>
            <Input
              id="card-month"
              inputMode="numeric"
              maxLength={2}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  expiryMonth: onlyDigits(event.target.value).slice(0, 2),
                }))
              }
              placeholder="MM"
              value={values.expiryMonth}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-year">Yıl</Label>
            <Input
              id="card-year"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  expiryYear: onlyDigits(event.target.value).slice(0, 4),
                }))
              }
              placeholder="YYYY"
              value={values.expiryYear}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-cvc">CVC</Label>
            <Input
              className="font-mono"
              id="card-cvc"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  cvc: onlyDigits(event.target.value).slice(0, 4),
                }))
              }
              placeholder="•••"
              type="password"
              value={values.cvc}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-category">
            Kategori
            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
              opsiyonel
            </span>
          </Label>
          <CategoryCombobox
            onChange={(val) =>
              setValues((current) => ({ ...current, category: val }))
            }
            value={values.category}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-notes">
            Notlar
            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
              opsiyonel
            </span>
          </Label>
          <Textarea
            className="resize-none"
            id="card-notes"
            onChange={set("notes")}
            placeholder="Limit, banka notu, kampanya bilgisi…"
            rows={3}
            value={values.notes}
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </p>
        )}
      </div>

      <DialogFooter className="mt-4 border-t pt-4">
        <DialogClose asChild={true}>
          <Button disabled={saving} type="button" variant="outline">
            İptal
          </Button>
        </DialogClose>
        <Button disabled={saving} onClick={handleSubmit} type="button">
          {saving ? "Kaydediliyor…" : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Password Card ────────────────────────────────────────────────────────────

function PasswordCard({
  entry,
  onEdit,
  onDelete,
  selected,
  selectionMode,
  onToggleSelected,
}: {
  entry: VaultEntry;
  onEdit: () => void;
  onDelete: () => void;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelected: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const openUrl = () => {
    const url = entry.url.startsWith("http")
      ? entry.url
      : `https://${entry.url}`;
    const tauriWindow = window as TauriWindow;
    if (typeof window !== "undefined" && tauriWindow.__TAURI_INTERNALS__) {
      tauriWindow.__TAURI_INTERNALS__.invoke("plugin:opener|open_url", {
        url,
      });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const displayUrl = entry.url
    .replace(URL_PROTOCOL_REGEX, "")
    .replace(TRAILING_SLASH_REGEX, "");

  const notesIsLong =
    entry.notes.split("\n").length > 2 || entry.notes.length > 90;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card shadow-xs transition-all duration-200 hover:border-border/80 hover:shadow-sm",
        selected && "border-primary/60 ring-2 ring-primary/20"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {selectionMode && (
          <SelectionToggle checked={selected} onChange={onToggleSelected} />
        )}
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15">
          <KeyRound className="size-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[13.5px] leading-snug">
            {entry.title}
          </p>
          {entry.category && (
            <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-[10px] text-primary uppercase tracking-wide">
              {entry.category}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onEdit}
            type="button"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            type="button"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-4 h-px bg-border/50" />

      {/* ── Fields ── */}
      <div className="flex flex-col gap-0.5 p-3">
        {entry.username && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
            <Mail className="size-3.5 shrink-0 text-muted-foreground/45" />
            <span className="flex-1 truncate text-[13px] text-muted-foreground">
              {entry.username}
            </span>
            <CopyButton value={entry.username} />
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          <Lock className="size-3.5 shrink-0 text-muted-foreground/45" />
          <span
            className="flex-1 select-none truncate font-mono text-[13px]"
            style={{ letterSpacing: "0.08em" }}
          >
            {visible
              ? entry.password
              : "•".repeat(Math.min(entry.password.length, 14))}
          </span>
          <button
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-foreground"
            onClick={() => setVisible((v) => !v)}
            type="button"
          >
            {visible ? (
              <EyeOff className="size-3" />
            ) : (
              <Eye className="size-3" />
            )}
          </button>
          <CopyButton value={entry.password} />
        </div>

        {entry.url && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
            <Globe className="size-3.5 shrink-0 text-muted-foreground/45" />
            <button
              className="flex-1 truncate text-left text-[13px] text-muted-foreground transition-colors hover:text-primary"
              onClick={openUrl}
              type="button"
            >
              {displayUrl}
            </button>
            <CopyButton value={entry.url} />
          </div>
        )}

        {entry.notes && (
          <div className="mt-1.5 rounded-xl bg-muted/40 px-3 py-2.5">
            <div className="flex gap-2">
              <NotebookText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/45" />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "whitespace-pre-wrap break-words text-[12px] text-muted-foreground leading-relaxed",
                    !notesExpanded && "line-clamp-2"
                  )}
                >
                  {entry.notes}
                </p>
                {notesIsLong && (
                  <button
                    className="mt-1 text-[11px] text-primary/70 transition-colors hover:text-primary"
                    onClick={() => setNotesExpanded((v) => !v)}
                    type="button"
                  >
                    {notesExpanded ? "Daha az" : "Daha fazla"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentCard({
  entry,
  onEdit,
  onDelete,
  selected,
  selectionMode,
  onToggleSelected,
}: {
  entry: VaultEntry;
  onEdit: () => void;
  onDelete: () => void;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelected: () => void;
}) {
  const cvc = entry.cvc ?? "";
  const cardNumber = entry.cardNumber ?? "";
  const formattedNumber = formatCardNumber(cardNumber);
  const expiry = `${entry.expiryMonth ?? "MM"}/${entry.expiryYear?.slice(-2) ?? "YY"}`;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all duration-200 hover:border-border/80 hover:shadow-sm",
        selected && "border-primary/60 ring-2 ring-primary/20"
      )}
    >
      <div className="relative bg-gradient-to-br from-foreground to-foreground/70 p-4 text-background">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectionMode && (
              <SelectionToggle checked={selected} onChange={onToggleSelected} />
            )}
            <CreditCard className="size-5" />
            <span className="font-semibold text-sm">{entry.cardBrand}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="flex size-7 items-center justify-center rounded-lg bg-background/15 transition-colors hover:bg-background/25"
              onClick={onEdit}
              type="button"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              className="flex size-7 items-center justify-center rounded-lg bg-background/15 transition-colors hover:bg-background/25"
              onClick={onDelete}
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        <p className="font-mono text-lg tracking-wider">{formattedNumber}</p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase opacity-70">Kart sahibi</p>
            <p className="truncate font-medium text-sm">
              {entry.cardholderName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase opacity-70">Son kullanım</p>
            <p className="font-mono text-sm">{expiry}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          <CreditCard className="size-3.5 shrink-0 text-muted-foreground/45" />
          <span className="flex-1 truncate font-mono text-[13px]">
            {formattedNumber}
          </span>
          <CopyButton value={cardNumber} />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          <NotebookText className="size-3.5 shrink-0 text-muted-foreground/45" />
          <span className="flex-1 truncate text-[13px] text-muted-foreground">
            {entry.cardholderName}
          </span>
          <CopyButton value={entry.cardholderName ?? ""} />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          <Lock className="size-3.5 shrink-0 text-muted-foreground/45" />
          <span className="flex-1 font-mono text-[13px] tracking-wider">
            {"•".repeat(Math.max(cvc.length, 3))}
          </span>
          <CopyButton value={cvc} />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          <FolderOpen className="size-3.5 shrink-0 text-muted-foreground/45" />
          <span className="flex-1 truncate text-[13px] text-muted-foreground">
            {expiry}
          </span>
          <CopyButton value={expiry} />
        </div>
        {entry.category && (
          <span className="mx-2 mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-[10px] text-primary uppercase tracking-wide">
            {entry.category}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog onOpenChange={(v) => !v && onCancel()} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Şifreyi Sil</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Bu kayıt kalıcı olarak silinecek. Emin misiniz?
        </p>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">
            İptal
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            Sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Browser Import Dialog ────────────────────────────────────────────────────

const BROWSER_LABELS: Record<string, { bg: string; text: string }> = {
  Chrome: { bg: "bg-blue-500/10", text: "text-blue-500" },
  Firefox: { bg: "bg-orange-500/10", text: "text-orange-500" },
  Safari: { bg: "bg-sky-500/10", text: "text-sky-500" },
  Edge: { bg: "bg-teal-500/10", text: "text-teal-500" },
  Bitwarden: { bg: "bg-indigo-500/10", text: "text-indigo-500" },
  LastPass: { bg: "bg-red-500/10", text: "text-red-500" },
  "1Password": { bg: "bg-blue-600/10", text: "text-blue-600" },
  Diğer: { bg: "bg-muted", text: "text-muted-foreground" },
};

function BrowserImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { bulkAddEntries } = useVaultStore();
  const { addCategory } = useCategoriesStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<BrowserImportEntry[]>([]);
  const [browser, setBrowser] = useState<string>("");
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setEntries([]);
    setBrowser("");
    setSkipped(0);
    setError("");
    setDone(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleFile = (file: File) => {
    setError("");
    setDone(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = parseBrowserCSV((ev.target?.result as string) ?? "");
        if (result.entries.length === 0) {
          setError("Dosyada içe aktarılabilir şifre bulunamadı.");
          return;
        }
        setEntries(result.entries);
        setBrowser(result.detectedBrowser);
        setSkipped(result.skipped);
      } catch {
        setError("Dosya okunamadı. Lütfen geçerli bir CSV seçin.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    setLoading(true);
    setError("");
    try {
      await bulkAddEntries(entries);
      const cats = [...new Set(entries.map((e) => e.category).filter(Boolean))];
      cats.forEach(addCategory);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const colors = BROWSER_LABELS[browser] ?? BROWSER_LABELS.Diğer;

  const renderImportContent = () => {
    if (done) {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="size-6 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold">İçe aktarma tamamlandı</p>
            <p className="mt-1 text-muted-foreground text-sm">
              {entries.length} şifre başarıyla eklendi.
            </p>
          </div>
          <Button
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Kapat
          </Button>
        </div>
      );
    }

    if (entries.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-semibold text-xs",
                  colors?.bg,
                  colors?.text
                )}
              >
                {browser}
              </span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{entries.length}</strong>{" "}
                şifre bulundu
                {skipped > 0 && `, ${skipped} atlandı`}
              </span>
            </div>
            <button
              className="text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
              onClick={reset}
              type="button"
            >
              Değiştir
            </button>
          </div>

          <div className="max-h-52 divide-y overflow-y-auto rounded-md border">
            {entries.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: preview list, stable order
              <div className="flex items-center gap-2.5 px-3 py-2" key={i}>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <KeyRound className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{e.title}</p>
                  {e.username && (
                    <p className="truncate text-muted-foreground text-xs">
                      {e.username}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button onClick={reset} type="button" variant="outline">
              Geri
            </Button>
            <Button disabled={loading} onClick={handleImport}>
              {loading
                ? "İçe Aktarılıyor…"
                : `${entries.length} Şifreyi İçe Aktar`}
            </Button>
          </DialogFooter>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Chrome, Firefox, Safari, Edge, Bitwarden, LastPass ve 1Password'den
          dışa aktarılan CSV dosyalarını destekler.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {Object.keys(BROWSER_LABELS)
            .filter((b) => b !== "Diğer")
            .map((b) => {
              const c = BROWSER_LABELS[b];
              return (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium text-xs",
                    c?.bg,
                    c?.text
                  )}
                  key={b}
                >
                  {b}
                </span>
              );
            })}
        </div>

        <button
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              handleFile(file);
            }
          }}
          type="button"
        >
          <Upload className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">
              CSV dosyasını buraya sürükleyin
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              veya seçmek için tıklayın
            </p>
          </div>
        </button>

        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFile(file);
            }
          }}
          ref={fileRef}
          type="file"
        />

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild={true}>
            <Button type="button" variant="outline">
              İptal
            </Button>
          </DialogClose>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog
      onOpenChange={(v) => {
        if (!v) {
          reset();
        }
        onOpenChange(v);
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            Tarayıcıdan İçe Aktar
          </DialogTitle>
        </DialogHeader>

        {renderImportContent()}
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Dialog ────────────────────────────────────────────────────────────

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { importVault } = useVaultStore();
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) {
      setError("Lütfen bir dosya seçin.");
      return;
    }
    if (!password) {
      setError("Lütfen vault şifresini girin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await importVault(file, password);
      onOpenChange(false);
    } catch {
      setError("Dosya açılamadı. Şifrenizi kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Vault İçe Aktar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vault Dosyası (.psv)</Label>
            <button
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-4 text-muted-foreground text-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <Upload className="size-4 shrink-0" />
              {file ? file.name : "Dosya seçmek için tıklayın"}
            </button>
            <input
              accept=".psv,.json"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              ref={fileRef}
              type="file"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="import-pw">Ana Şifre</Label>
            <Input
              className="font-mono"
              id="import-pw"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              value={password}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              İptal
            </Button>
          </DialogClose>
          <Button disabled={loading} onClick={handleImport}>
            {loading ? "İçe Aktarılıyor…" : "İçe Aktar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This page coordinates encrypted vault actions, filters, selection, and dialogs in one route-level surface.
export function PasswordsPage() {
  const {
    status,
    vault,
    lock,
    exportVault,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntries,
    updateEntriesCategory,
  } = useVaultStore();
  const { activeCategory, addCategory } = useCategoriesStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VaultItemType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") {
      return "grid";
    }
    const storedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return storedViewMode === "grid" ||
      storedViewMode === "compact" ||
      storedViewMode === "list"
      ? storedViewMode
      : "grid";
  });
  const [newItemType, setNewItemType] = useState<VaultItemType>("password");
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<VaultEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [browserImportOpen, setBrowserImportOpen] = useState(false);
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");

  const entries = (vault?.entries ?? []).filter(
    (e) =>
      (activeCategory === null || e.category === activeCategory) &&
      (typeFilter === "all" || getEntryType(e) === typeFilter) &&
      (e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.username.toLowerCase().includes(search.toLowerCase()) ||
        e.url.toLowerCase().includes(search.toLowerCase()) ||
        (e.cardholderName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (e.cardNumber ?? "").includes(onlyDigits(search)))
  );

  const selectionMode = selectionEnabled || selectedIds.length > 0;
  const passwordCount =
    vault?.entries.filter((e) => getEntryType(e) === "password").length ?? 0;
  const cardCount =
    vault?.entries.filter((e) => getEntryType(e) === "card").length ?? 0;

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  };

  const clearSelection = () => {
    setSelectionEnabled(false);
    setSelectedIds([]);
    setBulkCategory("");
  };

  const handleBulkMove = async () => {
    const category = bulkCategory.trim();
    if (!category || selectedIds.length === 0) {
      return;
    }
    await updateEntriesCategory(selectedIds, category);
    addCategory(category);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    await deleteEntries(selectedIds);
    setBulkDeleteOpen(false);
    clearSelection();
  };

  if (status !== "unlocked") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <Lock className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Vault kilitli.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-xl">Şifrelerim</h1>
          <p className="text-muted-foreground text-xs">
            {vault?.entries.length ?? 0} kayıt · {passwordCount} şifre ·{" "}
            {cardCount} kart · AES-256-GCM ile şifreli
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setBrowserImportOpen(true)}
            title="Tarayıcıdan içe aktar"
            type="button"
          >
            <Globe className="size-4" />
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setImportOpen(true)}
            title="Vault dosyasından içe aktar"
            type="button"
          >
            <Upload className="size-4" />
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={exportVault}
            title="Dışa aktar"
            type="button"
          >
            <Download className="size-4" />
          </button>
          <button
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md border px-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
              selectionMode && "bg-muted text-foreground"
            )}
            onClick={() => setSelectionEnabled((current) => !current)}
            title="Çoklu seçim"
            type="button"
          >
            <Check className="size-4" />
            Seç
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={lock}
            title="Kilitle"
            type="button"
          >
            <Lock className="size-4" />
          </button>
          <Dialog onOpenChange={setAddOpen} open={addOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0" size="sm">
                <Plus className="mr-1.5 size-4" />
                Kayıt Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {newItemType === "password" ? "Şifre Ekle" : "Kart Ekle"}
                </DialogTitle>
              </DialogHeader>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <button
                  className={cn(
                    "rounded-md px-3 py-2 font-medium text-sm transition-colors",
                    newItemType === "password"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setNewItemType("password")}
                  type="button"
                >
                  Şifre
                </button>
                <button
                  className={cn(
                    "rounded-md px-3 py-2 font-medium text-sm transition-colors",
                    newItemType === "card"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setNewItemType("card")}
                  type="button"
                >
                  Kart
                </button>
              </div>
              {newItemType === "password" ? (
                <PasswordForm
                  onSubmit={async (data) => {
                    await addEntry(data);
                    if (data.category.trim()) {
                      addCategory(data.category.trim());
                    }
                    setAddOpen(false);
                  }}
                  submitLabel="Ekle"
                />
              ) : (
                <CardForm
                  onSubmit={async (data) => {
                    await addEntry(data);
                    if (data.category.trim()) {
                      addCategory(data.category.trim());
                    }
                    setAddOpen(false);
                  }}
                  submitLabel="Kartı Ekle"
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-3 border-b px-6 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tümü"],
              ["password", "Şifreler"],
              ["card", "Kartlar"],
            ].map(([value, label]) => (
              <button
                className={cn(
                  "rounded-md border px-3 py-1.5 font-medium text-sm transition-colors",
                  typeFilter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                key={value}
                onClick={() => setTypeFilter(value as "all" | VaultItemType)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex w-fit rounded-lg border bg-muted/40 p-1">
            {VIEW_MODE_OPTIONS.map(({ icon: Icon, label, value }) => (
              <button
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 font-medium text-xs transition-colors",
                  viewMode === value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={value}
                onClick={() => setViewMode(value)}
                title={`${label} görünüm`}
                type="button"
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık, kullanıcı adı, URL veya kart ara…"
            value={search}
          />
        </div>
      </div>

      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-6 py-3">
          <span className="font-medium text-sm">
            {selectedIds.length} kayıt seçildi
          </span>
          <div className="min-w-48">
            <CategoryCombobox onChange={setBulkCategory} value={bulkCategory} />
          </div>
          <Button
            disabled={!bulkCategory.trim()}
            onClick={handleBulkMove}
            size="sm"
          >
            <FolderOpen className="mr-1.5 size-4" />
            Kategoriye taşı
          </Button>
          <Button
            onClick={() => setBulkDeleteOpen(true)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="mr-1.5 size-4" />
            Sil
          </Button>
          <Button onClick={clearSelection} size="sm" variant="outline">
            Seçimi temizle
          </Button>
        </div>
      )}

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <KeyRound className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {search ? "Sonuç bulunamadı" : "Henüz kayıt eklenmedi"}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                {search
                  ? "Farklı bir arama terimi deneyin."
                  : "İlk şifrenizi veya kartınızı ekleyin — şifreli olarak saklanacak."}
              </p>
            </div>
            {!search && (
              <Button onClick={() => setAddOpen(true)} size="sm">
                <Plus className="mr-1.5 size-4" />
                İlk kaydı ekle
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 items-start",
              viewMode === "grid" && "gap-4 sm:grid-cols-2 lg:grid-cols-3",
              viewMode === "compact" &&
                "gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
              viewMode === "list" && "gap-3"
            )}
          >
            {entries.map((entry) =>
              getEntryType(entry) === "card" ? (
                <PaymentCard
                  entry={entry}
                  key={entry.id}
                  onDelete={() => setDeleteId(entry.id)}
                  onEdit={() => setEditEntry(entry)}
                  onToggleSelected={() => toggleSelected(entry.id)}
                  selected={selectedIds.includes(entry.id)}
                  selectionMode={selectionMode}
                />
              ) : (
                <PasswordCard
                  entry={entry}
                  key={entry.id}
                  onDelete={() => setDeleteId(entry.id)}
                  onEdit={() => setEditEntry(entry)}
                  onToggleSelected={() => toggleSelected(entry.id)}
                  selected={selectedIds.includes(entry.id)}
                  selectionMode={selectionMode}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditEntry(null);
          }
        }}
        open={!!editEntry}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editEntry && getEntryType(editEntry) === "card"
                ? "Kartı Düzenle"
                : "Şifreyi Düzenle"}
            </DialogTitle>
          </DialogHeader>
          {editEntry && getEntryType(editEntry) === "password" && (
            <PasswordForm
              initial={editEntry}
              key={editEntry.id}
              onSubmit={async (data) => {
                await updateEntry(editEntry.id, data);
                if (data.category.trim()) {
                  addCategory(data.category.trim());
                }
                setEditEntry(null);
              }}
              submitLabel="Kaydet"
            />
          )}
          {editEntry && getEntryType(editEntry) === "card" && (
            <CardForm
              initial={editEntry}
              key={editEntry.id}
              onSubmit={async (data) => {
                await updateEntry(editEntry.id, data);
                if (data.category.trim()) {
                  addCategory(data.category.trim());
                }
                setEditEntry(null);
              }}
              submitLabel="Kaydet"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <DeleteConfirmDialog
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteEntry(deleteId);
            setDeleteId(null);
          }
        }}
        open={!!deleteId}
      />

      <DeleteConfirmDialog
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        open={bulkDeleteOpen}
      />

      {/* Import dialog */}
      <ImportDialog onOpenChange={setImportOpen} open={importOpen} />

      {/* Browser import dialog */}
      <BrowserImportDialog
        onOpenChange={setBrowserImportOpen}
        open={browserImportOpen}
      />
    </div>
  );
}
