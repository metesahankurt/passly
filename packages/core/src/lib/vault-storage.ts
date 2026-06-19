import type { EncryptedVault } from "@workspace/core/lib/vault-crypto";

const VAULT_KEY = "psv-vault";

export function loadEncryptedVault(): EncryptedVault | null {
  if (typeof window === "undefined") return null;
  try {
    const item = localStorage.getItem(VAULT_KEY);
    return item ? (JSON.parse(item) as EncryptedVault) : null;
  } catch {
    return null;
  }
}

export function saveEncryptedVault(vault: EncryptedVault): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function deleteEncryptedVault(): void {
  localStorage.removeItem(VAULT_KEY);
}

export async function exportVaultFile(vault: EncryptedVault): Promise<void> {
  const content = JSON.stringify(vault, null, 2);
  const filename = `passly-vault-${Date.now()}.psv`;

  // showSaveFilePicker works in Edge/WebView2 (Windows Tauri) and Chrome
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "Passly Vault", accept: { "application/json": [".psv"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
  }

  // Fallback: anchor click (macOS WebKit)
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importVaultFile(file: File): Promise<EncryptedVault> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.version !== 1 || !parsed.salt || !parsed.iv || !parsed.data) {
          reject(new Error("Geçersiz vault dosyası."));
          return;
        }
        resolve(parsed as EncryptedVault);
      } catch {
        reject(new Error("Dosya okunamadı."));
      }
    };
    reader.onerror = () => reject(new Error("Dosya okuma hatası."));
    reader.readAsText(file);
  });
}
