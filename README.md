<div align="center">
  <img src="apps/native/public/logo-light.png#gh-light-mode-only" alt="Passly" width="200" />
  <img src="apps/native/public/logo-dark.png#gh-dark-mode-only" alt="Passly" width="200" />

  <h3>Passly</h3>
  <p>A local-first, open-source password manager for macOS and Windows.</p>

  <p>
    <a href="https://github.com/metesahankurt/passly/releases/latest">
      <img src="https://img.shields.io/github/v/release/metesahankurt/passly?style=flat-square&color=0f172a" alt="Latest Release" />
    </a>
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-0f172a?style=flat-square" alt="Platform" />
    <img src="https://img.shields.io/badge/encryption-AES--256--GCM-0f172a?style=flat-square" alt="Encryption" />
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/metesahankurt/passly?style=flat-square&color=0f172a" alt="License" />
    </a>
  </p>
</div>

---

Passly stores your passwords **entirely on your device** — no cloud sync, no accounts, no telemetry. Your vault is encrypted with AES-256-GCM and a master password only you know.

## Features

- **AES-256-GCM encryption** with PBKDF2 key derivation — industry-standard, zero-knowledge
- **Category organization** — group passwords with custom categories and a live-filter combobox
- **Browser CSV import** — import directly from Chrome, Firefox, Safari, Edge, Bitwarden, LastPass, and 1Password
- **Command palette** — press `Cmd+K` / `Ctrl+K` to search and copy any password instantly
- **Activity log** — every vault action is recorded in a notification center
- **10 languages** — English, Turkish, German, Spanish, French, Italian, Japanese, Portuguese, Russian, Chinese
- **Light and dark theme**
- **No internet required** — fully offline after install

## Download

Go to the [latest release](https://github.com/metesahankurt/passly/releases/latest) and download the file for your platform:

| Platform | File |
|----------|------|
| macOS Apple Silicon (M1/M2/M3) | `Passly_*_aarch64.dmg` |
| macOS Intel | `Passly_*_x64.dmg` |
| Windows | `Passly_*_x64-setup.exe` |

> On first launch you will be asked to create a master password. This password cannot be recovered — store it somewhere safe.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/installation) v8+
- [Rust](https://www.rust-lang.org/tools/install) stable
- Xcode (macOS builds) or [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows builds)

See Tauri's [prerequisites guide](https://v2.tauri.app/start/prerequisites/) for platform-specific setup.

### Getting started

```bash
pnpm install
pnpm dev
```

This starts the Next.js dev server and the Tauri desktop app in parallel.

### Commands

```bash
pnpm dev          # Start desktop app in dev mode
pnpm build        # Production build
pnpm typecheck    # TypeScript validation
pnpm check        # Lint and format check
pnpm fix          # Auto-fix lint and formatting
pnpm clean        # Clean all build outputs
```

### Building releases

```bash
# macOS Apple Silicon
pnpm tauri build --target aarch64-apple-darwin

# macOS Intel
pnpm tauri build --target x86_64-apple-darwin

# Windows (via GitHub Actions)
# Trigger the Release workflow manually from the Actions tab
```

### Project structure

```
apps/
  native/           Next.js (static export) + Tauri 2 — desktop app

packages/
  core/             Pages, stores, hooks, components, business logic
  ui/               shadcn/ui design system, themes, global styles
  i18n/             Type-safe translations for all 10 locales
```

## Tech stack

- [Tauri 2](https://tauri.app/) — native shell, system tray, file access
- [Next.js](https://nextjs.org/) — UI framework (static export)
- [Zustand](https://zustand-demo.pmnd.rs/) — state management with persistence
- [shadcn/ui](https://ui.shadcn.com/) — component library
- [next-intl](https://next-intl-docs.vercel.app/) — internationalization
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — AES-256-GCM + PBKDF2

## License

[MIT](LICENSE)
