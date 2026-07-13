export interface BrowserImportEntry {
  category: string;
  notes: string;
  password: string;
  title: string;
  url: string;
  username: string;
}

const LINE_BREAK_REGEX = /\r?\n/;

// ── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(LINE_BREAK_REGEX).filter((l) => l.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVRow(lines[0] as string).map((h) =>
    h
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .trim()
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i] as string);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function safeHostname(raw: string): string {
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return u.hostname;
  } catch {
    return raw;
  }
}

// ── Format detection + mapping ──────────────────────────────────────────────

type Format =
  | "chrome" // name, url, username, password
  | "firefox" // url, username, password, httprealm, …
  | "safari" // title, url, username, password, notes, otpauth
  | "lastpass" // url, username, password, totp, extra, name, grouping, fav
  | "bitwarden" // folder, …, name, login_uri, login_username, login_password, …
  | "1password" // title, url, username, password, notes, type
  | "keepass" // account, login_name, password, web_site, comments
  | "generic";

function detectFormat(headers: string[]): Format {
  const h = new Set(headers);
  if (
    h.has("login_uri") ||
    h.has("login_username") ||
    h.has("login_password")
  ) {
    return "bitwarden";
  }
  if (h.has("grouping") && h.has("extra")) {
    return "lastpass";
  }
  if (h.has("httprealm") || h.has("formactionorigin")) {
    return "firefox";
  }
  if (h.has("otpauth")) {
    return "safari";
  }
  if (h.has("account") || h.has("login_name")) {
    return "keepass";
  }
  if (h.has("type") && h.has("title") && h.has("url")) {
    return "1password";
  }
  if (h.has("name") && h.has("url") && h.has("username") && h.has("password")) {
    return "chrome";
  }
  return "generic";
}

function mapRow(
  row: Record<string, string>,
  format: Format
): BrowserImportEntry | null {
  const g = (k: string) => row[k] ?? "";

  let title: string;
  let username: string;
  let password: string;
  let url: string;
  let notes: string;

  switch (format) {
    case "bitwarden":
      if (g("type") && g("type") !== "login") {
        return null;
      }
      title = g("name");
      username = g("login_username");
      password = g("login_password");
      url = g("login_uri");
      notes = g("notes");
      break;
    case "lastpass":
      title = g("name") || safeHostname(g("url"));
      username = g("username");
      password = g("password");
      url = g("url");
      notes = g("extra");
      break;
    case "firefox":
      title = safeHostname(g("url"));
      username = g("username");
      password = g("password");
      url = g("url");
      notes = "";
      break;
    case "safari":
      title = g("title");
      username = g("username");
      password = g("password");
      url = g("url");
      notes = g("notes");
      break;
    case "keepass":
      title = g("account");
      username = g("login_name");
      password = g("password");
      url = g("web_site");
      notes = g("comments");
      break;
    case "1password":
      title = g("title");
      username = g("username");
      password = g("password");
      url = g("url");
      notes = g("notes");
      break;
    default:
      title = g("name") || safeHostname(g("url"));
      username = g("username");
      password = g("password");
      url = g("url");
      notes = g("notes");
      break;
  }

  if (!password) {
    return null;
  }
  if (!title) {
    title = safeHostname(url) || "İsimsiz";
  }

  return { title, username, password, url, notes, category: "" };
}

// ── Public API ──────────────────────────────────────────────────────────────

export type BrowserName =
  | "Chrome"
  | "Firefox"
  | "Safari"
  | "Edge"
  | "Bitwarden"
  | "LastPass"
  | "1Password"
  | "Diğer";

export interface ParseResult {
  detectedBrowser: BrowserName;
  entries: BrowserImportEntry[];
  skipped: number;
}

const FORMAT_TO_BROWSER: Record<Format, BrowserName> = {
  chrome: "Chrome",
  firefox: "Firefox",
  safari: "Safari",
  lastpass: "LastPass",
  bitwarden: "Bitwarden",
  "1password": "1Password",
  keepass: "Diğer",
  generic: "Diğer",
};

export function parseBrowserCSV(csvText: string): ParseResult {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { entries: [], detectedBrowser: "Diğer", skipped: 0 };
  }

  const headers = Object.keys(rows[0] as Record<string, string>);
  const format = detectFormat(headers);
  const detectedBrowser = FORMAT_TO_BROWSER[format];

  let skipped = 0;
  const entries: BrowserImportEntry[] = [];

  for (const row of rows) {
    const entry = mapRow(row, format);
    if (entry) {
      entries.push(entry);
    } else {
      skipped++;
    }
  }

  return { entries, detectedBrowser, skipped };
}
