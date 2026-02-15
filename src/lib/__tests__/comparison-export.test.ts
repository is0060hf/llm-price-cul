import { describe, it, expect } from "vitest";
import { generateComparisonMarkdown } from "../comparison-export";
import type { ComparisonEntry, Assumptions, CostResult } from "@/types";

const mockAssumptions1: Assumptions = {
  modelName: "Claude Sonnet 4.5",
  auxiliaryModelName: "Claude Haiku 4.5",
  providerName: "Anthropic",
  dailyRequests: 300,
  monthlyWorkingDays: 20,
  maxInputChars: 1000,
  maxOutputChars: 1000,
  language: "ja",
  systemPromptChars: 2000,
  avgTurnsPerSession: 5,
  safetyMarginPercent: 20,
  currency: "USD",
  exchangeRate: 150,
  enabledOptions: ["トピック分類", "意味検索"],
  optionDetails: { "チャンク数": "5件" },
};

const mockResult1: CostResult = {
  costPerRequest: 0.12266,
  steps: [
    { name: "トピック分類", modelName: "Claude Haiku 4.5", description: "Embedding分類 + LLM判定（フォールバック率20%）", inputTokens: 1500, outputTokens: 10, costUsd: 0.002 },
    { name: "意味検索", modelName: "text-embedding-3-small", description: "クエリをベクトル化し、5件のチャンクから関連情報を検索", inputTokens: 3750, outputTokens: 0, costUsd: 0.001 },
    { name: "メインエージェント応答", modelName: "Claude Sonnet 4.5", description: "システムプロンプト+ユーザー入力+検索結果を統合して応答を生成", inputTokens: 9000, outputTokens: 1500, costUsd: 0.1 },
  ],
  dailyCostUsd: 36.80,
  monthlyCostUsd: 883.15,
  monthlyCostBeforeMargin: 735.96,
  monthlyCostJpy: 132472,
  annualCostUsd: 10597.82,
  annualCostJpy: 1589673,
  totalInputTokens: 14250,
  totalOutputTokens: 1510,
  safetyMarginRate: 20,
  exchangeRate: 150,
  longContextSurcharge: false,
  assumptions: mockAssumptions1,
};

const mockEntry1: ComparisonEntry = {
  id: "entry-1",
  label: "Claude Sonnet 4.5 - トピック分類+意味検索 (300req, 入力1,000/出力1,000文字)",
  result: mockResult1,
  createdAt: "2026-02-15T00:00:00.000Z",
};

const mockAssumptions2: Assumptions = {
  modelName: "GPT-5.2",
  auxiliaryModelName: "GPT-4.1 mini",
  providerName: "OpenAI",
  dailyRequests: 300,
  monthlyWorkingDays: 20,
  maxInputChars: 1000,
  maxOutputChars: 1000,
  language: "ja",
  systemPromptChars: 2000,
  avgTurnsPerSession: 5,
  safetyMarginPercent: 20,
  currency: "USD",
  exchangeRate: 150,
  enabledOptions: ["トピック分類", "意味検索"],
  optionDetails: { "チャンク数": "5件" },
};

const mockResult2: CostResult = {
  costPerRequest: 0.07232,
  steps: [
    { name: "トピック分類", modelName: "GPT-4.1 mini", description: "Embedding分類 + LLM判定（フォールバック率20%）", inputTokens: 1500, outputTokens: 10, costUsd: 0.001 },
    { name: "メインエージェント応答", modelName: "GPT-5.2", description: "システムプロンプト+ユーザー入力+検索結果を統合して応答を生成", inputTokens: 9000, outputTokens: 1500, costUsd: 0.05 },
  ],
  dailyCostUsd: 21.70,
  monthlyCostUsd: 520.73,
  monthlyCostBeforeMargin: 433.94,
  monthlyCostJpy: 78110,
  annualCostUsd: 6248.75,
  annualCostJpy: 937313,
  totalInputTokens: 10500,
  totalOutputTokens: 1510,
  safetyMarginRate: 20,
  exchangeRate: 150,
  longContextSurcharge: false,
  assumptions: mockAssumptions2,
};

const mockEntry2: ComparisonEntry = {
  id: "entry-2",
  label: "GPT-5.2 - トピック分類+意味検索 (300req, 入力1,000/出力1,000文字)",
  result: mockResult2,
  createdAt: "2026-02-15T01:00:00.000Z",
};

describe("generateComparisonMarkdown", () => {
  it("タイトルが含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("# LLMランニングコスト比較レポート");
  });

  it("1件のエントリで案1の詳細セクションが生成される", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("## 案1:");
    expect(md).toContain("Claude Sonnet 4.5");
    expect(md).toContain("### 前提条件");
    expect(md).toContain("### コスト内訳");
  });

  it("複数エントリで比較概要テーブルが横並びになる", () => {
    const md = generateComparisonMarkdown([mockEntry1, mockEntry2], "USD", 150);
    expect(md).toContain("## 比較概要");
    // ヘッダー行に案1と案2が含まれる
    expect(md).toContain("案1");
    expect(md).toContain("案2");
    // 両モデル名が比較概要に含まれる
    expect(md).toContain("Claude Sonnet 4.5");
    expect(md).toContain("GPT-5.2");
  });

  it("各案の詳細セクションにコスト内訳ステップが含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("トピック分類");
    expect(md).toContain("意味検索");
    expect(md).toContain("メインエージェント応答");
    // descriptionが含まれる
    expect(md).toContain("Embedding分類");
    // モデル名が含まれる
    expect(md).toContain("Claude Haiku 4.5");
  });

  it("前提条件にモデル・リクエスト数・文字数等が含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("Anthropic");
    expect(md).toContain("300");
    expect(md).toContain("1,000");
    expect(md).toContain("20%");
  });

  it("1リクエストあたり合計が含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("1リクエストあたり合計");
    expect(md).toContain("$0.122660");
  });

  it("比較概要に月額コスト・年間コスト・日次コスト等が含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1, mockEntry2], "USD", 150);
    expect(md).toContain("月額コスト");
    expect(md).toContain("年間コスト");
    expect(md).toContain("日次コスト");
    expect(md).toContain("$883.15");
    expect(md).toContain("$520.73");
  });

  it("有効オプションが前提条件に含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("トピック分類");
    expect(md).toContain("意味検索");
  });

  it("安全マージン率が前提条件に含まれる", () => {
    const md = generateComparisonMarkdown([mockEntry1], "USD", 150);
    expect(md).toContain("安全マージン");
    expect(md).toContain("20%");
  });
});
