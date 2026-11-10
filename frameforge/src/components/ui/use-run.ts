"use client";

import { useCallback, useState } from "react";
import type { Result } from "@/lib/result";
import { useToast } from "./toast";

/**
 * Runs a server action, tracks its pending state, and surfaces failures as a toast.
 * Resolves to the action's data, or undefined when it failed.
 */
export function useRun() {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async <T,>(promise: Promise<Result<T>>, successMessage?: string): Promise<T | undefined> => {
      setPending(true);
      try {
        const res = await promise;
        if (!res.ok) {
          toast.error(res.error);
          return undefined;
        }
        if (successMessage) toast.success(successMessage);
        return res.data;
      } catch {
        toast.error("Could not reach the server. Check your connection and try again.");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [toast],
  );
  return { run, pending };
}
