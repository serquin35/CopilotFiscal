"use client";

import { useAuth } from "@/context/AuthContext";
import { isDemoBusiness, DEMO_BANNER_TEXT } from "@/lib/environment";

export function EnvBanner() {
  const { business } = useAuth();
  if (!isDemoBusiness(business)) return null;
  return (
    <div
      role="alert"
      className="w-full bg-warning/15 border-b border-warning/30 px-4 py-1.5 text-center text-[11px] font-semibold text-warning print:hidden"
    >
      ⚠️ {DEMO_BANNER_TEXT}
    </div>
  );
}
