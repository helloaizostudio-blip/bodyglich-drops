"use client";

import { useSearchParams } from "next/navigation";

/** Shows the result of the last form action (?msg=… or ?err=…). */
export function Flash() {
  const params = useSearchParams();
  const msg = params.get("msg");
  const err = params.get("err");
  if (!msg && !err) return null;
  return (
    <div
      role="status"
      className={`mb-5 rounded-lg border px-4 py-3 text-sm ${err ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
    >
      {err ?? msg}
    </div>
  );
}
