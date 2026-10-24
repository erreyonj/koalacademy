"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GlossaryRedirect() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const qs = search.toString();
    router.replace(qs ? `/toolkit/glossary/?${qs}` : "/toolkit/glossary/");
  }, [router, search]);

  return null;
}

export default function LegacyGlossaryPage() {
  return (
    <Suspense fallback={null}>
      <GlossaryRedirect />
    </Suspense>
  );
}
