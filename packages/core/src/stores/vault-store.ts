import {
  decryptVault,
  encryptVault,
  type Vault,
  type VaultEntry,
} from "@workspace/core/lib/vault-crypto";
import {
  deleteEncryptedVault,
  exportVaultFile,
  importVaultFile,
  loadEncryptedVault,
  saveEncryptedVault,
} from "@workspace/core/lib/vault-storage";
import { useActivityStore } from "@workspace/core/stores/activity-store";
import { create } from "zustand";

const log = useActivityStore.getState;

type VaultStatus = "empty" | "locked" | "unlocked";

interface VaultState {
  addEntry(
    entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">
  ): Promise<void>;
  bulkAddEntries(
    entries: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">[]
  ): Promise<void>;
  clearCategoryFromEntries(category: string): Promise<void>;
  createVault(masterPassword: string): Promise<void>;
  deleteEntries(ids: string[]): Promise<void>;
  deleteEntriesByCategory(category: string): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  exportVault(): void;
  importVault(file: File, masterPassword: string): Promise<void>;

  initialize(): void;
  lock(): void;
  masterPassword: string | null;
  resetVault(): void;
  status: VaultStatus;
  unlock(masterPassword: string): Promise<void>;
  updateEntriesCategory(ids: string[], category: string): Promise<void>;
  updateEntry(
    id: string,
    data: Partial<Omit<VaultEntry, "id" | "createdAt">>
  ): Promise<void>;
  vault: Vault | null;
}

export const useVaultStore = create<VaultState>()((set, get) => ({
  status: "empty",
  vault: null,
  masterPassword: null,

  initialize() {
    if (get().status === "unlocked") {
      return;
    }
    const encrypted = loadEncryptedVault();
    set({ status: encrypted ? "locked" : "empty" });
  },

  async createVault(masterPassword) {
    const vault: Vault = { version: 1, entries: [] };
    const encrypted = await encryptVault(vault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ status: "unlocked", vault, masterPassword });
    log().addActivity({
      type: "vault_created",
      title: "Vault Oluşturuldu",
      description: "Şifre kasanız başarıyla oluşturuldu ve şifrelendi.",
    });
  },

  async unlock(masterPassword) {
    const encrypted = loadEncryptedVault();
    if (!encrypted) {
      throw new Error("Vault bulunamadı.");
    }
    const vault = await decryptVault(encrypted, masterPassword);
    set({ status: "unlocked", vault, masterPassword });
    log().addActivity({
      type: "vault_unlocked",
      title: "Vault Açıldı",
      description: `${vault.entries.length} şifre erişilebilir hale geldi.`,
    });
  },

  lock() {
    set({ status: "locked", vault: null, masterPassword: null });
  },

  resetVault() {
    deleteEncryptedVault();
    set({ status: "empty", vault: null, masterPassword: null });
  },

  async addEntry(entryData) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const entry: VaultEntry = {
      ...entryData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newVault: Vault = { ...vault, entries: [entry, ...vault.entries] };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "entry_added",
      title: "Şifre Eklendi",
      description: `"${entryData.title}" başarıyla kaydedildi.`,
    });
  },

  async bulkAddEntries(entriesData) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const now = Date.now();
    const newEntries = entriesData.map((data) => ({
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    const newVault: Vault = {
      ...vault,
      entries: [...newEntries, ...vault.entries],
    };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "browser_imported",
      title: "Tarayıcıdan İçe Aktarıldı",
      description: `${entriesData.length} şifre kasanıza eklendi.`,
    });
  },

  async updateEntry(id, data) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const targetTitle =
      vault.entries.find((e) => e.id === id)?.title ?? "Bilinmeyen";
    const entries = vault.entries.map((e) =>
      e.id === id ? { ...e, ...data, updatedAt: Date.now() } : e
    );
    const newVault: Vault = { ...vault, entries };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "entry_updated",
      title: "Şifre Güncellendi",
      description: `"${targetTitle}" başarıyla düzenlendi.`,
    });
  },

  async deleteEntry(id) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const targetTitle =
      vault.entries.find((e) => e.id === id)?.title ?? "Bilinmeyen";
    const entries = vault.entries.filter((e) => e.id !== id);
    const newVault: Vault = { ...vault, entries };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "entry_deleted",
      title: "Şifre Silindi",
      description: `"${targetTitle}" kalıcı olarak silindi.`,
    });
  },

  async deleteEntries(ids) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const selected = new Set(ids);
    const removed = vault.entries.filter((e) => selected.has(e.id)).length;
    const entries = vault.entries.filter((e) => !selected.has(e.id));
    const newVault: Vault = { ...vault, entries };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "entry_deleted",
      title: "Kayıtlar Silindi",
      description: `${removed} kayıt kalıcı olarak silindi.`,
    });
  },

  async updateEntriesCategory(ids, category) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const selected = new Set(ids);
    const entries = vault.entries.map((e) =>
      selected.has(e.id) ? { ...e, category, updatedAt: Date.now() } : e
    );
    const newVault: Vault = { ...vault, entries };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "entry_updated",
      title: "Kayıtlar Kategorilendi",
      description: `${ids.length} kayıt "${category}" kategorisine taşındı.`,
    });
  },

  async deleteEntriesByCategory(category) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      throw new Error("Vault kilitli.");
    }
    const removed = vault.entries.filter((e) => e.category === category).length;
    const entries = vault.entries.filter((e) => e.category !== category);
    const newVault: Vault = { ...vault, entries };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
    log().addActivity({
      type: "entry_deleted",
      title: "Kategori ve Şifreler Silindi",
      description: `"${category}" kategorisi ve ${removed} şifre kalıcı olarak silindi.`,
    });
  },

  async clearCategoryFromEntries(category) {
    const { vault, masterPassword } = get();
    if (!(vault && masterPassword)) {
      return;
    }
    const entries = vault.entries.map((e) =>
      e.category === category
        ? { ...e, category: "", updatedAt: Date.now() }
        : e
    );
    const newVault: Vault = { ...vault, entries };
    const encrypted = await encryptVault(newVault, masterPassword);
    saveEncryptedVault(encrypted);
    set({ vault: newVault });
  },

  async exportVault() {
    const encrypted = loadEncryptedVault();
    if (!encrypted) {
      return;
    }
    await exportVaultFile(encrypted);
    log().addActivity({
      type: "vault_exported",
      title: "Vault Dışa Aktarıldı",
      description: "Şifre kasanız .psv dosyası olarak indirildi.",
    });
  },

  async importVault(file, masterPassword) {
    const encrypted = await importVaultFile(file);
    const vault = await decryptVault(encrypted, masterPassword);
    saveEncryptedVault(encrypted);
    set({ status: "unlocked", vault, masterPassword });
    log().addActivity({
      type: "vault_imported",
      title: "Vault İçe Aktarıldı",
      description: `${vault.entries.length} şifre dosyadan yüklendi.`,
    });
  },
}));
