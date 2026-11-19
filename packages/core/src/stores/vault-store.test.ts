import { decryptVault, encryptVault } from "@workspace/core/lib/vault-crypto";
import {
  loadEncryptedVault,
  saveEncryptedVault,
} from "@workspace/core/lib/vault-storage";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";

type VaultStore =
  typeof import("@workspace/core/stores/vault-store").useVaultStore;

const oldPassword = "original-test-password";
const newPassword = "new-test-password";
const entry = {
  category: "Work",
  notes: "Example note",
  password: "entry-test-password",
  passwordHistory: ["historical-test-password"],
  title: "Example",
  url: "https://example.com",
  username: "example",
};

let useVaultStore: VaultStore;
let useCategoriesStore: typeof import("@workspace/core/stores/categories-store").useCategoriesStore;
const storedItems = new Map<string, string>();
const storage = {
  getItem: (key: string) => storedItems.get(key) ?? null,
  removeItem: (key: string) => storedItems.delete(key),
  setItem: vi.fn((key: string, value: string) => {
    storedItems.set(key, value);
  }),
};

beforeAll(async () => {
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  ({ useVaultStore } = await import("@workspace/core/stores/vault-store"));
  ({ useCategoriesStore } = await import(
    "@workspace/core/stores/categories-store"
  ));
});

beforeEach(async () => {
  storage.setItem.mockClear();
  useVaultStore.getState().resetVault();
  await useVaultStore.getState().createVault(oldPassword);
});

it("reopens a populated vault with only the new password and preserves its data", async () => {
  const store = useVaultStore.getState();
  const largeNotes = "🔐".repeat(40_000);
  await store.addEntry({ ...entry, notes: largeNotes });
  useCategoriesStore.getState().addCategory("Unused category");
  const originalEntries = useVaultStore.getState().vault?.entries;
  const originalBackup = loadEncryptedVault();

  await store.changeMasterPassword(oldPassword, newPassword);
  store.lock();
  await expect(store.unlock(oldPassword)).rejects.toThrow();
  await store.unlock(newPassword);

  const rotatedVault = useVaultStore.getState().vault;
  expect(rotatedVault?.entries).toEqual(originalEntries);
  expect(rotatedVault?.entries[0]?.notes).toBe(largeNotes);
  expect(rotatedVault?.categories).toEqual(["Unused category", "Work"]);
  expect(loadEncryptedVault()?.salt).not.toBe(originalBackup?.salt);
  expect(loadEncryptedVault()?.iv).not.toBe(originalBackup?.iv);

  if (!originalBackup) {
    throw new Error("Expected a backup captured before the password change.");
  }
  await expect(
    decryptVault(originalBackup, oldPassword)
  ).resolves.toMatchObject({
    entries: originalEntries,
  });
});

it.each([
  { current: "incorrect-password", next: newPassword, code: "invalidCurrent" },
  { current: oldPassword, next: "", code: "invalidNew" },
  { current: oldPassword, next: oldPassword, code: "samePassword" },
])("keeps the persisted vault unchanged for $code", async ({
  current,
  next,
  code,
}) => {
  const store = useVaultStore.getState();
  const original = loadEncryptedVault();
  storage.setItem.mockClear();

  await expect(store.changeMasterPassword(current, next)).rejects.toMatchObject(
    { code }
  );

  expect(storage.setItem).not.toHaveBeenCalled();
  expect(loadEncryptedVault()).toEqual(original);
  expect(useVaultStore.getState().masterPassword).toBe(oldPassword);
});

it("rejects an empty password when creating a vault", async () => {
  const store = useVaultStore.getState();
  store.resetVault();

  await expect(store.createVault("")).rejects.toThrow();
  expect(loadEncryptedVault()).toBeNull();
});

it("creates, changes and reopens a vault with single-character passwords", async () => {
  const store = useVaultStore.getState();
  store.resetVault();
  await store.createVault("x");
  store.lock();
  await store.unlock("x");

  await store.changeMasterPassword("x", " ");
  store.lock();

  await expect(store.unlock("x")).rejects.toThrow();
  await store.unlock(" ");
  expect(useVaultStore.getState().status).toBe("unlocked");
});

it("keeps the existing vault if storage fails and allows a retry", async () => {
  const store = useVaultStore.getState();
  const original = loadEncryptedVault();
  storage.setItem.mockImplementationOnce(() => {
    throw new Error("Storage full");
  });

  await expect(
    store.changeMasterPassword(oldPassword, newPassword)
  ).rejects.toThrow("Storage full");
  expect(loadEncryptedVault()).toEqual(original);
  expect(useVaultStore.getState().masterPassword).toBe(oldPassword);

  await store.changeMasterPassword(oldPassword, newPassword);
  store.lock();
  await store.unlock(newPassword);
});

it("preserves edits queued before and after the password change", async () => {
  const store = useVaultStore.getState();

  await Promise.all([
    store.addEntry({ ...entry, title: "Before" }),
    store.changeMasterPassword(oldPassword, newPassword),
    store.addEntry({ ...entry, title: "After" }),
  ]);
  store.lock();
  await expect(store.unlock(oldPassword)).rejects.toThrow();
  await store.unlock(newPassword);

  expect(
    useVaultStore.getState().vault?.entries.map((item) => item.title)
  ).toEqual(["After", "Before"]);
});

it("rejects a vault write from a session with an older stored copy", async () => {
  const store = useVaultStore.getState();
  const otherSessionCopy = await encryptVault(
    { entries: [], version: 1 },
    newPassword
  );
  saveEncryptedVault(otherSessionCopy);

  await expect(store.addEntry(entry)).rejects.toThrow(
    "The stored vault has changed"
  );
  await expect(
    store.changeMasterPassword(oldPassword, newPassword)
  ).rejects.toThrow("The stored vault has changed");
  expect(loadEncryptedVault()).toEqual(otherSessionCopy);
});

it("cancels a password change when the vault locks during encryption", async () => {
  const store = useVaultStore.getState();
  const original = loadEncryptedVault();
  const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
  const encryptSpy = vi
    .spyOn(crypto.subtle, "encrypt")
    .mockImplementationOnce((...args) => {
      store.lock();
      return encrypt(...args);
    });

  try {
    await expect(
      store.changeMasterPassword(oldPassword, newPassword)
    ).rejects.toThrow("The vault session changed");
    expect(useVaultStore.getState().status).toBe("locked");
    expect(useVaultStore.getState().masterPassword).toBeNull();
    expect(loadEncryptedVault()).toEqual(original);
    await store.unlock(oldPassword);
  } finally {
    encryptSpy.mockRestore();
  }
});
