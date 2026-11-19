import {
  decryptVault,
  type EncryptedVault,
  encryptVault,
  MIN_MASTER_PASSWORD_LENGTH,
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
import { useCategoriesStore } from "@workspace/core/stores/categories-store";
import { create } from "zustand";

const log = useActivityStore.getState;
const categoriesStore = useCategoriesStore.getState;

function getEntryCategories(vault: Vault): string[] {
  return Array.from(
    new Set(
      vault.entries
        .map((entry) => entry.category.trim())
        .filter((category) => category.length > 0)
    )
  );
}

type VaultStatus = "empty" | "locked" | "unlocked";
type PasswordChangeErrorCode = "invalidCurrent" | "invalidNew" | "samePassword";

export class VaultPasswordChangeError extends Error {
  readonly code: PasswordChangeErrorCode;

  constructor(code: PasswordChangeErrorCode) {
    super(code);
    this.code = code;
  }
}

interface VaultState {
  addEntry(
    entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">
  ): Promise<void>;
  bulkAddEntries(
    entries: Omit<VaultEntry, "id" | "createdAt" | "updatedAt">[]
  ): Promise<void>;
  changeMasterPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
  clearCategoryFromEntries(category: string): Promise<void>;
  createVault(masterPassword: string): Promise<void>;
  deleteEntries(ids: string[]): Promise<void>;
  deleteEntriesByCategory(category: string): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  exportVault(): Promise<void>;
  importVault(file: File, masterPassword: string): Promise<void>;
  initialize(): void;
  lock(): void;
  masterPassword: string | null;
  recordUsage(id: string): Promise<void>;
  resetVault(): void;
  status: VaultStatus;
  toggleFavorite(id: string): Promise<void>;
  unlock(masterPassword: string): Promise<void>;
  updateEntriesCategory(ids: string[], category: string): Promise<void>;
  updateEntry(
    id: string,
    data: Partial<Omit<VaultEntry, "id" | "createdAt">>
  ): Promise<void>;
  vault: Vault | null;
}

export const useVaultStore = create<VaultState>()((set, get) => {
  let pendingOperation = Promise.resolve();
  let sessionVersion = 0;
  let persistedCiphertext: string | undefined;

  function verifyStoredVault(expectedCiphertext: string | undefined) {
    if (loadEncryptedVault()?.data !== expectedCiphertext) {
      throw new Error(
        "The stored vault has changed. Lock and unlock to reload it."
      );
    }
  }

  function saveVault(
    encrypted: EncryptedVault,
    expectedCiphertext: string | undefined
  ) {
    verifyStoredVault(expectedCiphertext);
    saveEncryptedVault(encrypted);
    persistedCiphertext = encrypted.data;
  }

  function verifySession(version: number) {
    if (sessionVersion !== version) {
      throw new Error("The vault session changed.");
    }
  }

  function queueVaultOperation(
    operation: (ensureCurrentSession: () => void) => Promise<void>
  ): Promise<void> {
    const version = sessionVersion;
    const ensureCurrentSession = () => verifySession(version);
    const run = () => {
      ensureCurrentSession();
      return operation(ensureCurrentSession);
    };
    // Web Locks also serialize vault changes across tabs on the same origin.
    const result = pendingOperation.then(async () => {
      const locks = globalThis.navigator?.locks;
      await (locks ? locks.request("passly-vault", run) : run());
    });
    pendingOperation = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async function persistVaultUpdate(vault: Vault, masterPassword: string) {
    const version = sessionVersion;
    const expectedCiphertext = persistedCiphertext;
    const encrypted = await encryptVault(vault, masterPassword);
    verifySession(version);
    saveVault(encrypted, expectedCiphertext);
    set({ vault, masterPassword });
  }

  return {
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

    createVault(masterPassword) {
      return queueVaultOperation(async (ensureCurrentSession) => {
        if (masterPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
          throw new Error("Lütfen bir şifre girin.");
        }
        const expectedCiphertext = loadEncryptedVault()?.data;
        const vault: Vault = { version: 1, entries: [], categories: [] };
        const encrypted = await encryptVault(vault, masterPassword);
        ensureCurrentSession();
        saveVault(encrypted, expectedCiphertext);
        categoriesStore().replaceCategories([]);
        set({ status: "unlocked", vault, masterPassword });
        log().addActivity({
          type: "vault_created",
          title: "Vault Oluşturuldu",
          description: "Şifre kasanız başarıyla oluşturuldu ve şifrelendi.",
        });
      });
    },

    unlock(masterPassword) {
      return queueVaultOperation(async (ensureCurrentSession) => {
        const encrypted = loadEncryptedVault();
        if (!encrypted) {
          throw new Error("Vault bulunamadı.");
        }
        const vault = await decryptVault(encrypted, masterPassword);
        ensureCurrentSession();
        verifyStoredVault(encrypted.data);
        persistedCiphertext = encrypted.data;
        if (vault.categories) {
          categoriesStore().replaceCategories([
            ...vault.categories,
            ...getEntryCategories(vault),
          ]);
        }
        set({ status: "unlocked", vault, masterPassword });
        log().addActivity({
          type: "vault_unlocked",
          title: "Vault Açıldı",
          description: `${vault.entries.length} şifre erişilebilir hale geldi.`,
        });
      });
    },

    lock() {
      sessionVersion += 1;
      persistedCiphertext = undefined;
      set({ status: "locked", vault: null, masterPassword: null });
    },

    resetVault() {
      deleteEncryptedVault();
      sessionVersion += 1;
      persistedCiphertext = undefined;
      categoriesStore().replaceCategories([]);
      set({ status: "empty", vault: null, masterPassword: null });
    },

    changeMasterPassword(currentPassword, newPassword) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword, status } = get();
        if (status !== "unlocked" || !(vault && masterPassword)) {
          throw new Error("Vault kilitli.");
        }
        if (currentPassword !== masterPassword) {
          throw new VaultPasswordChangeError("invalidCurrent");
        }
        if (newPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
          throw new VaultPasswordChangeError("invalidNew");
        }
        if (newPassword === currentPassword) {
          throw new VaultPasswordChangeError("samePassword");
        }
        const updatedVault: Vault = {
          ...vault,
          categories: Array.from(
            new Set([
              ...categoriesStore().categories,
              ...getEntryCategories(vault),
            ])
          ),
        };
        await persistVaultUpdate(updatedVault, newPassword);
      });
    },

    addEntry(entryData) {
      return queueVaultOperation(async () => {
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
        const newVault: Vault = {
          ...vault,
          entries: [entry, ...vault.entries],
        };
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "entry_added",
          title: "Şifre Eklendi",
          description: `"${entryData.title}" başarıyla kaydedildi.`,
        });
      });
    },

    bulkAddEntries(entriesData) {
      return queueVaultOperation(async () => {
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
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "browser_imported",
          title: "Tarayıcıdan İçe Aktarıldı",
          description: `${entriesData.length} şifre kasanıza eklendi.`,
        });
      });
    },

    updateEntry(id, data) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          throw new Error("Vault kilitli.");
        }
        const existing = vault.entries.find((e) => e.id === id);
        const targetTitle = existing?.title ?? "Bilinmeyen";

        let passwordHistory = existing?.passwordHistory ?? [];
        if (
          data.password &&
          data.password !== existing?.password &&
          existing?.password
        ) {
          passwordHistory = [existing.password, ...passwordHistory].slice(
            0,
            10
          );
        }

        const entries = vault.entries.map((e) =>
          e.id === id
            ? { ...e, ...data, passwordHistory, updatedAt: Date.now() }
            : e
        );
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "entry_updated",
          title: "Şifre Güncellendi",
          description: `"${targetTitle}" başarıyla düzenlendi.`,
        });
      });
    },

    toggleFavorite(id) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          return;
        }
        const entries = vault.entries.map((e) =>
          e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
        );
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
      });
    },

    recordUsage(id) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          return;
        }
        const entries = vault.entries.map((e) =>
          e.id === id ? { ...e, lastUsed: Date.now() } : e
        );
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
      });
    },

    deleteEntry(id) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          throw new Error("Vault kilitli.");
        }
        const targetTitle =
          vault.entries.find((e) => e.id === id)?.title ?? "Bilinmeyen";
        const entries = vault.entries.filter((e) => e.id !== id);
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "entry_deleted",
          title: "Şifre Silindi",
          description: `"${targetTitle}" kalıcı olarak silindi.`,
        });
      });
    },

    deleteEntries(ids) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          throw new Error("Vault kilitli.");
        }
        const selected = new Set(ids);
        const removed = vault.entries.filter((e) => selected.has(e.id)).length;
        const entries = vault.entries.filter((e) => !selected.has(e.id));
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "entry_deleted",
          title: "Kayıtlar Silindi",
          description: `${removed} kayıt kalıcı olarak silindi.`,
        });
      });
    },

    updateEntriesCategory(ids, category) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          throw new Error("Vault kilitli.");
        }
        const selected = new Set(ids);
        const entries = vault.entries.map((e) =>
          selected.has(e.id) ? { ...e, category, updatedAt: Date.now() } : e
        );
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "entry_updated",
          title: "Kayıtlar Kategorilendi",
          description: `${ids.length} kayıt "${category}" kategorisine taşındı.`,
        });
      });
    },

    deleteEntriesByCategory(category) {
      return queueVaultOperation(async () => {
        const { vault, masterPassword } = get();
        if (!(vault && masterPassword)) {
          throw new Error("Vault kilitli.");
        }
        const removed = vault.entries.filter(
          (e) => e.category === category
        ).length;
        const entries = vault.entries.filter((e) => e.category !== category);
        const newVault: Vault = { ...vault, entries };
        await persistVaultUpdate(newVault, masterPassword);
        log().addActivity({
          type: "entry_deleted",
          title: "Kategori ve Şifreler Silindi",
          description: `"${category}" kategorisi ve ${removed} şifre kalıcı olarak silindi.`,
        });
      });
    },

    clearCategoryFromEntries(category) {
      return queueVaultOperation(async () => {
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
        await persistVaultUpdate(newVault, masterPassword);
      });
    },

    async exportVault() {
      const { vault, masterPassword } = get();
      if (!(vault && masterPassword)) {
        return;
      }
      const exportedVault: Vault = {
        ...vault,
        categories: [
          ...categoriesStore().categories,
          ...getEntryCategories(vault),
        ],
      };
      const encrypted = await encryptVault(exportedVault, masterPassword);
      await exportVaultFile(encrypted);
      log().addActivity({
        type: "vault_exported",
        title: "Vault Dışa Aktarıldı",
        description: "Şifre kasanız .psv dosyası olarak indirildi.",
      });
    },

    importVault(file, masterPassword) {
      return queueVaultOperation(async (ensureCurrentSession) => {
        const expectedCiphertext = loadEncryptedVault()?.data;
        const encrypted = await importVaultFile(file);
        const vault = await decryptVault(encrypted, masterPassword);
        const importedCategories = [
          ...(vault.categories ?? []),
          ...getEntryCategories(vault),
        ];
        ensureCurrentSession();
        saveVault(encrypted, expectedCiphertext);
        categoriesStore().replaceCategories(importedCategories);
        set({ status: "unlocked", vault, masterPassword });
        log().addActivity({
          type: "vault_imported",
          title: "Vault İçe Aktarıldı",
          description: `${vault.entries.length} şifre dosyadan yüklendi.`,
        });
      });
    },
  };
});
