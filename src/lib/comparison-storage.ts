import type { ComparisonEntry, CostResult } from "@/types";

const STORAGE_KEY = "llm-cost-comparisons";

export function loadComparisons(): ComparisonEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ComparisonEntry[];
  } catch {
    return [];
  }
}

export function saveComparison(label: string, result: CostResult): ComparisonEntry {
  const entry: ComparisonEntry = {
    id: crypto.randomUUID(),
    label,
    result,
    createdAt: new Date().toISOString(),
  };
  const entries = loadComparisons();
  entries.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entry;
}

export function removeComparison(id: string): void {
  const entries = loadComparisons().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearComparisons(): void {
  localStorage.removeItem(STORAGE_KEY);
}
