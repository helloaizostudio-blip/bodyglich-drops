import type { CostEntry, Project, Settings } from "./types";
import { listProjects } from "./store";

export class CostLimitError extends Error {}

/** Anthropic list prices per million tokens (input, output). */
const ANTHROPIC_PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-fable-5-2": [8, 40],
};

export function anthropicCost(model: string, input: number, output: number): number {
  const [i, o] = ANTHROPIC_PRICES[model] ?? [4, 20];
  return (input * i + output * o) / 1_000_000;
}

export const projectSpend = (p: Pick<Project, "costs">) => p.costs.reduce((a, c) => a + c.usd, 0);

export async function monthSpend(): Promise<number> {
  const month = new Date().toISOString().slice(0, 7);
  const projects = await listProjects();
  return projects.flatMap((p) => p.costs).filter((c) => c.at.startsWith(month)).reduce((a, c) => a + c.usd, 0);
}

/** Throws before a paid call would push the project or the month over its limit. */
export async function assertBudget(p: Project | null, s: Settings, estimateUsd: number, what: string) {
  if (p && projectSpend(p) + estimateUsd > s.costLimits.perVideoUsd)
    throw new CostLimitError(
      `Cost limit: ${what} (~$${estimateUsd.toFixed(3)}) would exceed the per-video limit of $${s.costLimits.perVideoUsd} (spent $${projectSpend(p).toFixed(3)}).`,
    );
  const m = await monthSpend();
  if (m + estimateUsd > s.costLimits.monthlyUsd)
    throw new CostLimitError(`Cost limit: monthly spend $${m.toFixed(2)} + ${what} would exceed $${s.costLimits.monthlyUsd}.`);
}

export function recordCost(p: Project | null, entry: Omit<CostEntry, "at">) {
  if (p) p.costs.push({ ...entry, at: new Date().toISOString() });
}
