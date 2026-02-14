import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadComparisons,
  saveComparison,
  removeComparison,
  clearComparisons,
  buildComparisonLabel,
} from "../comparison-storage";
import type { ComparisonEntry, CostResult, Assumptions } from "@/types";

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const mockAssumptions: Assumptions = {
  modelName: "GPT-4.1",
  auxiliaryModelName: "GPT-4.1 nano",
  providerName: "OpenAI",
  dailyRequests: 100,
  monthlyWorkingDays: 20,
  maxInputChars: 1000,
  maxOutputChars: 1500,
  language: "ja",
  systemPromptChars: 2000,
  avgTurnsPerSession: 1,
  safetyMarginPercent: 20,
  currency: "USD",
  exchangeRate: 150,
  enabledOptions: [],
  optionDetails: {},
};

const mockResult: CostResult = {
  costPerRequest: 0.027,
  steps: [{ name: "メインエージェント応答", modelName: "GPT-4.1", description: "応答生成", inputTokens: 4500, outputTokens: 2250, costUsd: 0.027 }],
  dailyCostUsd: 2.70,
  monthlyCostUsd: 64.80,
  monthlyCostBeforeMargin: 54.0,
  monthlyCostJpy: 9720,
  annualCostUsd: 777.6,
  annualCostJpy: 116640,
  totalInputTokens: 4500,
  totalOutputTokens: 2250,
  safetyMarginRate: 20,
  exchangeRate: 150,
  longContextSurcharge: false,
  assumptions: mockAssumptions,
};

describe("comparison-storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("初期状態で空配列を返す", () => {
    expect(loadComparisons()).toEqual([]);
  });

  it("比較エントリを保存できる", () => {
    saveComparison("パターンA", mockResult);
    const entries = loadComparisons();
    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe("パターンA");
    expect(entries[0].result.monthlyCostUsd).toBe(64.80);
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].createdAt).toBeTruthy();
  });

  it("複数エントリを保存できる", () => {
    saveComparison("パターンA", mockResult);
    saveComparison("パターンB", { ...mockResult, monthlyCostUsd: 100 });
    const entries = loadComparisons();
    expect(entries).toHaveLength(2);
  });

  it("IDで削除できる", () => {
    saveComparison("パターンA", mockResult);
    saveComparison("パターンB", mockResult);
    const entries = loadComparisons();
    removeComparison(entries[0].id);
    const remaining = loadComparisons();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe("パターンB");
  });

  it("全削除できる", () => {
    saveComparison("A", mockResult);
    saveComparison("B", mockResult);
    clearComparisons();
    expect(loadComparisons()).toEqual([]);
  });
});

describe("buildComparisonLabel", () => {
  it("モデル名・リクエスト数・文字数・オプションを含むラベルが生成される", () => {
    const label = buildComparisonLabel(mockAssumptions);
    expect(label).toContain("GPT-4.1");
    expect(label).toContain("100");
    expect(label).toContain("1,000");
    expect(label).toContain("1,500");
  });

  it("オプションありの場合はオプション名が含まれる", () => {
    const assumptions: Assumptions = {
      ...mockAssumptions,
      enabledOptions: ["意味検索", "会話履歴参照"],
    };
    const label = buildComparisonLabel(assumptions);
    expect(label).toContain("意味検索");
    expect(label).toContain("会話履歴参照");
  });

  it("オプションなしの場合は基本構成と表示される", () => {
    const label = buildComparisonLabel(mockAssumptions);
    expect(label).toContain("基本構成");
  });

  it("入力文字数が異なると異なるラベルが生成される", () => {
    const label1 = buildComparisonLabel(mockAssumptions);
    const label2 = buildComparisonLabel({ ...mockAssumptions, maxInputChars: 3000 });
    expect(label1).not.toBe(label2);
  });

  it("出力文字数が異なると異なるラベルが生成される", () => {
    const label1 = buildComparisonLabel(mockAssumptions);
    const label2 = buildComparisonLabel({ ...mockAssumptions, maxOutputChars: 3000 });
    expect(label1).not.toBe(label2);
  });

  it("リクエスト数が異なると異なるラベルが生成される", () => {
    const label1 = buildComparisonLabel(mockAssumptions);
    const label2 = buildComparisonLabel({ ...mockAssumptions, dailyRequests: 500 });
    expect(label1).not.toBe(label2);
  });

  it("モデルが異なると異なるラベルが生成される", () => {
    const label1 = buildComparisonLabel(mockAssumptions);
    const label2 = buildComparisonLabel({ ...mockAssumptions, modelName: "Claude Sonnet 4.5" });
    expect(label1).not.toBe(label2);
  });

  it("オプション構成が異なると異なるラベルが生成される", () => {
    const label1 = buildComparisonLabel({ ...mockAssumptions, enabledOptions: ["意味検索"] });
    const label2 = buildComparisonLabel({ ...mockAssumptions, enabledOptions: ["意味検索", "Web参照"] });
    expect(label1).not.toBe(label2);
  });
});
