const siteUrl = "https://github.com/metesahankurt/passly";
const repoUrl = "https://github.com/metesahankurt/passly";
const apiUrl = "https://api.github.com/repos/metesahankurt/passly";

export const siteConfig = {
  name: "Passly",
  owner: "metesahankurt",
  headline: "Şifrelerinizi güvenle saklayın",
  description:
    "AES-256-GCM ile şifrelenmiş yerel şifre yöneticisi. Mac ve Windows için.",
  links: {
    website: siteUrl,
    github: repoUrl,
    profile: "https://github.com/metesahankurt",
    issues: `${repoUrl}/issues`,
    discussions: `${repoUrl}/discussions`,
    releases: `${repoUrl}/releases`,
    releasesLatest: `${repoUrl}/releases/latest`,
    license: `${repoUrl}/blob/master/LICENSE`,
    changelog: `${repoUrl}/blob/master/CHANGELOG.md`,
    contributing: `${repoUrl}/blob/master/CONTRIBUTING.md`,
    githubApi: `${apiUrl}/releases?per_page=10`,
  },
};

export type SiteConfig = typeof siteConfig;
