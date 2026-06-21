import { siteConfig } from "@workspace/core/config/site";
import { themeInitScript } from "@workspace/core/scripts/theme-init";
import { hasLocale, messages, NextIntlClientProvider } from "@workspace/i18n";
import { routing } from "@workspace/i18n/routing";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { AppLayout } from "./components/app-layout";
import "@workspace/ui/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Get messages for the current locale (client-side loading for Tauri)
  const localeMessages = messages[locale as keyof typeof messages];

  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} overflow-hidden antialiased`}
      >
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted theme init script */}
        <Script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          id="theme-init"
          strategy="beforeInteractive"
        />
        <NextIntlClientProvider
          locale={locale}
          messages={localeMessages}
          timeZone="UTC"
        >
          <AppLayout>{children}</AppLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
