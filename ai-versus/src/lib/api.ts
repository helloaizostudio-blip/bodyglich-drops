import { NextResponse } from "next/server";
import { CostLimitError } from "./costs";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(e: unknown, status?: number) {
  const msg = e instanceof Error ? e.message : String(e);
  const code = status ?? (e instanceof CostLimitError ? 402 : /missing|not found/i.test(msg) ? 400 : 500);
  return NextResponse.json({ error: msg }, { status: code });
}

/** Wrap a route handler with uniform error handling. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error(e);
      return fail(e);
    }
  };
}
