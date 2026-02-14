import type { Assumptions, ComparisonEntry, CostResult } from "@/types";

const STORAGE_KEY = "llm-cost-comparisons";

/**
 * 比較表のラベルを生成する。
 * ざっくりモードの全入力項目（モデル・リクエスト数・文字数・オプション）を反映し、
 * 条件の異なる見積もりが別ラベルとなるようにする。
 */
export function buildComparisonLabel(assumptions: Assumptions): string {
  const options = assumptions.enabledOptions.length > 0
    ? assumptions.enabledOptions.join("+")
    : "基本構成";
  return `${assumptions.modelName} - ${options} (${assumptions.dailyRequests}req, 入力${assumptions.maxInputChars.toLocaleString("ja-JP")}/出力${assumptions.maxOutputChars.toLocaleString("ja-JP")}文字)`;
}

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
