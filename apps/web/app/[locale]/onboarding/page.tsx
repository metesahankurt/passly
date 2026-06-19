"use client";

import { OnboardingPage } from "@workspace/core/pages/onboarding-page";
import { useRouter } from "@workspace/i18n/navigation";

export default function Onboarding() {
  const router = useRouter();
  return <OnboardingPage onComplete={() => router.replace("/vault")} />;
}
