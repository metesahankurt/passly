const siteUrl = "https://vault-app.dev";
const repoUrl = "https://github.com/metesahankurt/vault-app";
const apiUrl = "https://api.github.com/repos/metesahankurt/vault-app";

export const siteConfig = {
  name: "Passly",
  owner: "metesahankurt",
  headline: "Build Cross-Platform Apps Faster Than Ever",
  description:
    "A production-grade starter template for building cross-platform apps. Write your code once and ship to Web, Desktop, and Mobile from a single codebase. Powered by Next.js and Tauri.",
  links: {
    website: siteUrl,
    github: repoUrl,
    issues: `${repoUrl}/issues`,
    discussions: `${repoUrl}/discussions`,
    releases: `${repoUrl}/releases/latest`,
    license: `${repoUrl}/blob/master/LICENSE`,
    changelog: `${repoUrl}/blob/master/CHANGELOG.md`,
    contributing: `${repoUrl}/blob/master/CONTRIBUTING.md`,
    githubApi: `${apiUrl}/releases?per_page=10`,
  },
};

export type SiteConfig = typeof siteConfig;
