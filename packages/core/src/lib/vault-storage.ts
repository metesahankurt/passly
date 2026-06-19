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

export function exportVaultFile(vault: EncryptedVault): void {
  const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `passwords-vault-${Date.now()}.psv`;
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
