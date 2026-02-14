import { describe, it, expect } from "vitest";
import {
  convertToTokens,
  calcTopicClassificationCost,
  calcOrchestratorCost,
  calcSemanticSearchCost,
  calcReembeddingCost,
  calcWebSearchCost,
  calcConversationHistoryCost,
  calcMainAgentCost,
  calcSubAgentCost,
  calcCompressionCost,
  calcRequestCost,
  calcMonthlyCost,
  calcGrowthProjection,
  estimateSystemPromptChars,
  convertSimpleToDetailed,
} from "../cost-calculator";
import {
  MODEL_PAIRINGS,
  getRecommendedAuxiliary,
  isMainModelEligible,
} from "@/lib/constants/defaults";
import type { Model, EmbeddingModel, WebSearchTool, SystemPromptEstimation, SimpleModeInput } from "@/types";

// ベンチマークフィールドのデフォルト値（テスト用）
const nullBenchmarks = {
  benchmarkGpqa: null, benchmarkSweBench: null, benchmarkAime: null,
  benchmarkArcAgi: null, benchmarkMmmu: null, benchmarkOverall: null,
} as const;

// --- テスト用モックデータ ---
const mockModel: Model = {
  id: 1, providerId: 1, providerName: "OpenAI", name: "GPT-4.1",
  category: "standard", inputPrice: 2.0, outputPrice: 8.0,
  cacheWritePrice: null, cacheReadPrice: 0.5,
  maxContextLength: 1000000, isLegacy: false, ...nullBenchmarks,
};

const mockAnthropicModel: Model = {
  id: 2, providerId: 2, providerName: "Anthropic", name: "Claude Sonnet 4.5",
  category: "standard", inputPrice: 3.0, outputPrice: 15.0,
  cacheWritePrice: 3.75, cacheReadPrice: 0.3,
  maxContextLength: 200000, isLegacy: false, ...nullBenchmarks,
};

const mockLightModel: Model = {
  id: 3, providerId: 1, providerName: "OpenAI", name: "GPT-4.1 nano",
  category: "lightweight", inputPrice: 0.1, outputPrice: 0.4,
  cacheWritePrice: null, cacheReadPrice: 0.025,
  maxContextLength: 1000000, isLegacy: false, ...nullBenchmarks,
};

// --- ペアリングテスト用モックデータ ---
const mockGpt52: Model = {
  id: 10, providerId: 1, providerName: "OpenAI", name: "GPT-5.2",
  category: "flagship", inputPrice: 1.75, outputPrice: 14.0,
  cacheWritePrice: null, cacheReadPrice: 0.175,
  maxContextLength: null, isLegacy: false, ...nullBenchmarks,
};

const mockGpt41Mini: Model = {
  id: 11, providerId: 1, providerName: "OpenAI", name: "GPT-4.1 mini",
  category: "standard", inputPrice: 0.4, outputPrice: 1.6,
  cacheWritePrice: null, cacheReadPrice: 0.1,
  maxContextLength: 1000000, isLegacy: false, ...nullBenchmarks,
};

const mockClaudeOpus46: Model = {
  id: 20, providerId: 2, providerName: "Anthropic", name: "Claude Opus 4.6",
  category: "flagship", inputPrice: 5.0, outputPrice: 25.0,
  cacheWritePrice: 6.25, cacheReadPrice: 0.5,
  maxContextLength: 200000, isLegacy: false, ...nullBenchmarks,
};

const mockClaudeHaiku45: Model = {
  id: 21, providerId: 2, providerName: "Anthropic", name: "Claude Haiku 4.5",
  category: "lightweight", inputPrice: 1.0, outputPrice: 5.0,
  cacheWritePrice: 1.25, cacheReadPrice: 0.1,
  maxContextLength: 200000, isLegacy: false, ...nullBenchmarks,
};

const mockClaudeHaiku45Legacy: Model = {
  id: 22, providerId: 2, providerName: "Anthropic", name: "Claude Haiku 4.5",
  category: "lightweight", inputPrice: 1.0, outputPrice: 5.0,
  cacheWritePrice: 1.25, cacheReadPrice: 0.1,
  maxContextLength: 200000, isLegacy: true, ...nullBenchmarks,
};

const mockGemini3Pro: Model = {
  id: 30, providerId: 3, providerName: "Google", name: "Gemini 3 Pro Preview",
  category: "flagship", inputPrice: 2.0, outputPrice: 12.0,
  cacheWritePrice: null, cacheReadPrice: 0.2,
  maxContextLength: 200000, isLegacy: false, ...nullBenchmarks,
};

const mockGemini3Flash: Model = {
  id: 31, providerId: 3, providerName: "Google", name: "Gemini 3 Flash Preview",
  category: "standard", inputPrice: 0.5, outputPrice: 3.0,
  cacheWritePrice: null, cacheReadPrice: 0.05,
  maxContextLength: 200000, isLegacy: false, ...nullBenchmarks,
};

const mockGpt4oMini: Model = {
  id: 12, providerId: 1, providerName: "OpenAI", name: "GPT-4o-mini",
  category: "lightweight", inputPrice: 0.15, outputPrice: 0.6,
  cacheWritePrice: null, cacheReadPrice: 0.075,
  maxContextLength: 128000, isLegacy: false, ...nullBenchmarks,
};

const allMockModels: Model[] = [
  mockModel, mockAnthropicModel, mockLightModel,
  mockGpt52, mockGpt41Mini, mockClaudeOpus46, mockClaudeHaiku45,
  mockGemini3Pro, mockGemini3Flash, mockGpt4oMini,
];

const mockEmbedding: EmbeddingModel = {
  id: 1, providerId: 1, providerName: "OpenAI", name: "text-embedding-3-small",
  inputPrice: 0.02, dimensions: 1536, pricingTier: "online",
};

const mockWebSearch: WebSearchTool = {
  id: 1, providerId: 1, providerName: "OpenAI", name: "OpenAI Web Search",
  pricePerKCalls: 10.0, additionalPricingNotes: null,
};

// =============================================
// 1. convertToTokens
// =============================================
describe("convertToTokens", () => {
  it("日本語 1000文字 → 1500トークン", () => {
    expect(convertToTokens(1000, "ja")).toBe(1500);
  });
  it("英語 1000文字 → 250トークン", () => {
    expect(convertToTokens(1000, "en")).toBe(250);
  });
  it("混在 1000文字 → 700トークン", () => {
    expect(convertToTokens(1000, "mixed")).toBe(700);
  });
  it("0文字 → 0トークン", () => {
    expect(convertToTokens(0, "ja")).toBe(0);
  });
});

// =============================================
// 2. calcTopicClassificationCost
// =============================================
describe("calcTopicClassificationCost", () => {
  it("無効時は0を返す", () => {
    const result = calcTopicClassificationCost(false, 0, null, null, "ja", 1000);
    expect(result.costUsd).toBe(0);
  });
  it("フォールバック0%: Embedding APIのみ", () => {
    const result = calcTopicClassificationCost(true, 0, mockLightModel, mockEmbedding, "ja", 1000);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.name).toBe("トピック分類");
  });
  it("フォールバック100%: Embedding + LLM毎回", () => {
    const r0 = calcTopicClassificationCost(true, 0, mockLightModel, mockEmbedding, "ja", 1000);
    const r100 = calcTopicClassificationCost(true, 100, mockLightModel, mockEmbedding, "ja", 1000);
    expect(r100.costUsd).toBeGreaterThan(r0.costUsd);
  });
  it("フォールバック100%時にoutputTokensが50を返す", () => {
    const result = calcTopicClassificationCost(true, 100, mockLightModel, mockEmbedding, "ja", 1000);
    expect(result.outputTokens).toBe(50);
  });
  it("フォールバック50%時にoutputTokensが按分される", () => {
    const result = calcTopicClassificationCost(true, 50, mockLightModel, mockEmbedding, "ja", 1000);
    expect(result.outputTokens).toBe(25); // 50 * 0.5
  });
  it("フォールバック0%時にoutputTokensが0を返す", () => {
    const result = calcTopicClassificationCost(true, 0, mockLightModel, mockEmbedding, "ja", 1000);
    expect(result.outputTokens).toBe(0);
  });
});

// =============================================
// 3. calcOrchestratorCost
// =============================================
describe("calcOrchestratorCost", () => {
  it("無効時は0を返す", () => {
    const result = calcOrchestratorCost(false, null, "ja", 1000, 500);
    expect(result.costUsd).toBe(0);
  });
  it("有効時はLLM1回分のコスト", () => {
    const result = calcOrchestratorCost(true, mockLightModel, "ja", 1000, 500);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.name).toBe("オーケストレータ");
  });
});

// =============================================
// 4. calcSemanticSearchCost
// =============================================
describe("calcSemanticSearchCost", () => {
  it("無効時は0を返す", () => {
    const result = calcSemanticSearchCost(false, 0, 0, null, false, null, "ja", 1000);
    expect(result.costUsd).toBe(0);
  });
  it("有効時: Embedding + チャンクのトークン増分", () => {
    const result = calcSemanticSearchCost(true, 5, 500, mockEmbedding, false, null, "ja", 1000);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.name).toBe("意味検索");
  });
  it("リランキング有効時はコストが増加する", () => {
    const without = calcSemanticSearchCost(true, 5, 500, mockEmbedding, false, null, "ja", 1000);
    const withRerank = calcSemanticSearchCost(true, 5, 500, mockEmbedding, true, mockLightModel, "ja", 1000);
    expect(withRerank.costUsd).toBeGreaterThan(without.costUsd);
  });
});

// =============================================
// 4b. calcReembeddingCost (再埋め込みコスト)
// =============================================
describe("calcReembeddingCost", () => {
  it("再埋め込み文字数0のとき0コスト", () => {
    const result = calcReembeddingCost(0, mockEmbedding, "ja");
    expect(result.costUsd).toBe(0);
  });
  it("月100万文字の再埋め込みコストが算出される", () => {
    const result = calcReembeddingCost(1_000_000, mockEmbedding, "ja");
    // 100万文字 * 1.5 = 150万トークン -> 150万 / 100万 * $0.02 = $0.03
    expect(result.costUsd).toBeCloseTo(0.03, 5);
    expect(result.name).toBe("再埋め込み");
  });
  it("Embeddingモデルがnullのとき0コスト", () => {
    const result = calcReembeddingCost(1_000_000, null, "ja");
    expect(result.costUsd).toBe(0);
  });
});

// =============================================
// 5. calcWebSearchCost
// =============================================
describe("calcWebSearchCost", () => {
  it("無効時は0を返す", () => {
    const result = calcWebSearchCost(false, null, 0, 0, false, null, "ja");
    expect(result.costUsd).toBe(0);
  });
  it("検索回数に比例したコスト", () => {
    const r1 = calcWebSearchCost(true, mockWebSearch, 1, 3, false, null, "ja");
    const r5 = calcWebSearchCost(true, mockWebSearch, 5, 3, false, null, "ja");
    expect(r5.costUsd).toBeGreaterThan(r1.costUsd);
  });
  it("要約有効時はコスト増加", () => {
    const without = calcWebSearchCost(true, mockWebSearch, 1, 3, false, null, "ja");
    const withSum = calcWebSearchCost(true, mockWebSearch, 1, 3, true, mockLightModel, "ja");
    expect(withSum.costUsd).toBeGreaterThan(without.costUsd);
  });
});

// =============================================
// 6. calcConversationHistoryCost
// =============================================
describe("calcConversationHistoryCost", () => {
  it("無効時は0トークン", () => {
    const result = calcConversationHistoryCost(false, 0, "ja", 1000, 1500);
    expect(result.inputTokens).toBe(0);
  });
  it("ターン数に応じたトークン増分 (セクション5.4の算式)", () => {
    // 平均増分 = (maxTurns/2) * (inputChars + outputChars) * tokenRate
    const result = calcConversationHistoryCost(true, 10, "ja", 1000, 1500);
    const expected = (10 / 2) * (1000 + 1500) * 1.5;
    expect(result.inputTokens).toBe(expected);
  });
  it("ターン数が多いほどトークンが増加する", () => {
    const r5 = calcConversationHistoryCost(true, 5, "ja", 1000, 1500);
    const r20 = calcConversationHistoryCost(true, 20, "ja", 1000, 1500);
    expect(r20.inputTokens).toBeGreaterThan(r5.inputTokens);
  });
});

// =============================================
// 7. calcMainAgentCost
// =============================================
describe("calcMainAgentCost", () => {
  it("システムプロンプト + ユーザー入力 + 出力のコスト", () => {
    const result = calcMainAgentCost(mockModel, "ja", 2000, 1000, 1500, 0, 0, 0, false);
    expect(result.costUsd).toBeGreaterThan(0);
    // インプット = (2000+1000)*1.5 = 4500 トークン
    expect(result.inputTokens).toBe(4500);
    // アウトプット = 1500*1.5 = 2250 トークン
    expect(result.outputTokens).toBe(2250);
  });
  it("Prompt Caching ONでシステムプロンプト部分にCacheRead単価適用", () => {
    const off = calcMainAgentCost(mockModel, "ja", 2000, 1000, 1500, 0, 0, 0, false);
    const on = calcMainAgentCost(mockModel, "ja", 2000, 1000, 1500, 0, 0, 0, true);
    expect(on.costUsd).toBeLessThan(off.costUsd);
  });
});

// =============================================
// 8. calcSubAgentCost
// =============================================
describe("calcSubAgentCost", () => {
  it("呼び出し0回は0コスト", () => {
    const result = calcSubAgentCost(0, null, "ja", 1000, 500);
    expect(result.costUsd).toBe(0);
  });
  it("呼び出し回数に比例したコスト", () => {
    const r1 = calcSubAgentCost(1, mockLightModel, "ja", 1000, 500);
    const r5 = calcSubAgentCost(5, mockLightModel, "ja", 1000, 500);
    expect(r5.costUsd).toBeCloseTo(r1.costUsd * 5, 10);
  });
});

// =============================================
// 9. calcCompressionCost
// =============================================
describe("calcCompressionCost", () => {
  it("無効時は0コスト", () => {
    const result = calcCompressionCost(false, 0, null, "ja", 1000, 1500, 10);
    expect(result.costUsd).toBe(0);
  });
  it("圧縮頻度に応じた按分コスト (1/頻度)", () => {
    const r3 = calcCompressionCost(true, 3, mockLightModel, "ja", 1000, 1500, 10);
    const r10 = calcCompressionCost(true, 10, mockLightModel, "ja", 1000, 1500, 10);
    expect(r3.costUsd).toBeGreaterThan(r10.costUsd);
  });
});

// =============================================
// 10. calcRequestCost (統合計算)
// =============================================
describe("calcRequestCost", () => {
  it("全OFFの最小構成でコストが算出される", () => {
    const result = calcRequestCost({
      mainModel: mockModel,
      language: "ja",
      systemPromptChars: 2000,
      maxInputChars: 1000,
      maxOutputChars: 1500,
      avgTurnsPerSession: 1,
      topicClassification: false, classificationFallbackRate: 0, classificationModel: null,
      orchestrator: false, orchestratorModel: null,
      subAgentMaxCalls: 0, subAgentModel: null,
      semanticSearchEnabled: false, searchChunkCount: 0, searchChunkSize: 0, embeddingModel: null, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: false, maxHistoryTurns: 0, historyCompression: false, compressionFrequency: 0, compressionModel: null,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0, webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
      promptCaching: false,
    });
    expect(result.costPerRequest).toBeGreaterThan(0);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("200K超過時にAnthropicモデルで割増が適用される", () => {
    const normalResult = calcRequestCost({
      mainModel: mockAnthropicModel,
      language: "ja", systemPromptChars: 2000, maxInputChars: 1000, maxOutputChars: 1500,
      avgTurnsPerSession: 1,
      topicClassification: false, classificationFallbackRate: 0, classificationModel: null,
      orchestrator: false, orchestratorModel: null,
      subAgentMaxCalls: 0, subAgentModel: null,
      semanticSearchEnabled: false, searchChunkCount: 0, searchChunkSize: 0, embeddingModel: null, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: false, maxHistoryTurns: 0, historyCompression: false, compressionFrequency: 0, compressionModel: null,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0, webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
      promptCaching: false,
    });

    // 200K超過する構成: 大量の意味検索チャンク + 長い会話履歴
    const longResult = calcRequestCost({
      mainModel: mockAnthropicModel,
      language: "ja", systemPromptChars: 50000, maxInputChars: 3000, maxOutputChars: 3000,
      avgTurnsPerSession: 10,
      topicClassification: false, classificationFallbackRate: 0, classificationModel: null,
      orchestrator: false, orchestratorModel: null,
      subAgentMaxCalls: 0, subAgentModel: null,
      semanticSearchEnabled: true, searchChunkCount: 20, searchChunkSize: 2000, embeddingModel: mockEmbedding, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: true, maxHistoryTurns: 20, historyCompression: false, compressionFrequency: 0, compressionModel: null,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0, webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
      promptCaching: false,
    });

    expect(longResult.longContextSurcharge).toBe(true);
  });
});

// =============================================
// 11. calcMonthlyCost
// =============================================
describe("calcMonthlyCost", () => {
  it("月額 = 日次 × 稼働日数 × (1 + マージン率)", () => {
    const result = calcMonthlyCost(0.027, 100, 20, 20, 150);
    // 日次 = 0.027 * 100 = 2.70
    expect(result.dailyCostUsd).toBeCloseTo(2.70, 5);
    // 月次 = 2.70 * 20 * 1.2 = 64.80
    expect(result.monthlyCostUsd).toBeCloseTo(64.80, 5);
    expect(result.monthlyCostBeforeMargin).toBeCloseTo(54.0, 5);
    // JPY = 64.80 * 150 = 9720.0
    expect(result.monthlyCostJpy).toBeCloseTo(9720.0, 2);
  });
  it("マージン0%では日次×稼働日数と一致", () => {
    const result = calcMonthlyCost(1.0, 10, 20, 0, 150);
    expect(result.monthlyCostUsd).toBeCloseTo(200.0, 5);
  });
  it("年間コスト = 月額 × 12", () => {
    const result = calcMonthlyCost(0.027, 100, 20, 20, 150);
    expect(result.annualCostUsd).toBeCloseTo(64.80 * 12, 2);
    expect(result.annualCostJpy).toBeCloseTo(64.80 * 12 * 150, 0);
  });
});

// =============================================
// 11b. calcGrowthProjection (成長シナリオ)
// =============================================
describe("calcGrowthProjection", () => {
  it("倍率指定モード: 各月の倍率に応じたコスト推移", () => {
    const multipliers = [1, 1, 1.5, 1.5, 2, 2, 2, 2, 3, 3, 3, 3];
    const result = calcGrowthProjection(100.0, 150, { mode: "multiplier", monthlyMultipliers: multipliers, monthlyGrowthRate: 0 });
    expect(result.projections).toHaveLength(12);
    expect(result.projections[0].monthlyCostUsd).toBeCloseTo(100.0, 2);
    expect(result.projections[2].monthlyCostUsd).toBeCloseTo(150.0, 2);
    expect(result.projections[4].monthlyCostUsd).toBeCloseTo(200.0, 2);
    expect(result.projections[8].monthlyCostUsd).toBeCloseTo(300.0, 2);
    expect(result.totalAnnualCostUsd).toBeCloseTo(
      100+100+150+150+200+200+200+200+300+300+300+300, 2
    );
  });

  it("月次成長率モード: 月10%成長で12ヶ月", () => {
    const result = calcGrowthProjection(100.0, 150, { mode: "monthlyRate", monthlyMultipliers: [], monthlyGrowthRate: 10 });
    expect(result.projections).toHaveLength(12);
    expect(result.projections[0].monthlyCostUsd).toBeCloseTo(100.0, 2);
    // 2ヶ月目: 100 * 1.1 = 110
    expect(result.projections[1].monthlyCostUsd).toBeCloseTo(110.0, 2);
    // 3ヶ月目: 100 * 1.1^2 = 121
    expect(result.projections[2].monthlyCostUsd).toBeCloseTo(121.0, 2);
    // 累積コストが単調増加
    expect(result.projections[11].cumulativeCostUsd).toBeGreaterThan(result.projections[5].cumulativeCostUsd);
    // JPY換算
    expect(result.projections[0].monthlyCostJpy).toBeCloseTo(15000, 0);
  });

  it("成長率0%なら全月同額", () => {
    const result = calcGrowthProjection(50.0, 150, { mode: "monthlyRate", monthlyMultipliers: [], monthlyGrowthRate: 0 });
    for (const p of result.projections) {
      expect(p.monthlyCostUsd).toBeCloseTo(50.0, 2);
    }
    expect(result.totalAnnualCostUsd).toBeCloseTo(600.0, 2);
  });
});

// =============================================
// 12. estimateSystemPromptChars
// =============================================
describe("estimateSystemPromptChars", () => {
  it("全none: ベース文字数(200)のみ", () => {
    const input: SystemPromptEstimation = {
      a1Guardrails: "none", a2Compliance: "none", a3ProhibitedTopics: "none",
      a4PriorityRules: "none", a5ErrorHandling: "none",
      b1DomainKnowledge: "none", b2FewShotExamples: "none", b3WorkflowDefinition: "none",
      c1OutputFormat: "none", c2PersonaTone: "none", c3ResponseLength: "none",
      c4CitationRules: "none", c5MultiLanguage: "none",
      d1ToolDefinitions: "none", d2ReferenceInstructions: "none", d3ApiIntegration: "none",
      e1UserSegments: "none", e2DynamicContext: "none", e3MultiStepReasoning: "none",
      e4ExceptionHandling: "none",
    };
    expect(estimateSystemPromptChars(input)).toBe(200);
  });

  it("全high: ベース + 全要素のhigh値の合計", () => {
    const input: SystemPromptEstimation = {
      a1Guardrails: "high", a2Compliance: "high", a3ProhibitedTopics: "high",
      a4PriorityRules: "high", a5ErrorHandling: "high",
      b1DomainKnowledge: "high", b2FewShotExamples: "high", b3WorkflowDefinition: "high",
      c1OutputFormat: "high", c2PersonaTone: "high", c3ResponseLength: "high",
      c4CitationRules: "high", c5MultiLanguage: "high",
      d1ToolDefinitions: "high", d2ReferenceInstructions: "high", d3ApiIntegration: "high",
      e1UserSegments: "high", e2DynamicContext: "high", e3MultiStepReasoning: "high",
      e4ExceptionHandling: "high",
    };
    const result = estimateSystemPromptChars(input);
    // 合計: 1500+1000+500+400+600 + 2000+2000+1500 + 800+400+200+300+600 + 3000+800+1000 + 1000+500+800+1000 + 200
    expect(result).toBeGreaterThan(200);
    expect(result).toBe(200 + 1500+1000+500+400+600+2000+2000+1500+800+400+200+300+600+3000+800+1000+1000+500+800+1000);
  });
});

// =============================================
// 13. convertSimpleToDetailed
// =============================================
describe("convertSimpleToDetailed", () => {
  it("シンプルQ&Aで全オプションOFFになる", () => {
    const input: SimpleModeInput = {
      modelId: 1, dailyRequests: 100,
      inputLengthPreset: "medium", outputLengthPreset: "medium",
      customInputChars: null, customOutputChars: null,
      useCaseType: "simpleQA",
    };
    const result = convertSimpleToDetailed(input);
    expect(result.semanticSearchEnabled).toBe(false);
    expect(result.conversationHistory).toBe(false);
    expect(result.webSearch).toBe(false);
    expect(result.topicClassification).toBe(false);
    expect(result.orchestrator).toBe(false);
    expect(result.maxInputChars).toBe(1000);
    expect(result.maxOutputChars).toBe(1500);
    expect(result.monthlyWorkingDays).toBe(20);
  });

  it("カスタム文字数が正しく反映される", () => {
    const input: SimpleModeInput = {
      modelId: 1, dailyRequests: 100,
      inputLengthPreset: "custom", outputLengthPreset: "custom",
      customInputChars: 800, customOutputChars: 1200,
      useCaseType: "simpleQA",
    };
    const result = convertSimpleToDetailed(input);
    expect(result.maxInputChars).toBe(800);
    expect(result.maxOutputChars).toBe(1200);
  });

  it("汎用AIアシスタントで全オプションONになる", () => {
    const input: SimpleModeInput = {
      modelId: 1, dailyRequests: 50,
      inputLengthPreset: "long", outputLengthPreset: "long",
      customInputChars: null, customOutputChars: null,
      useCaseType: "generalAssistant",
    };
    const result = convertSimpleToDetailed(input);
    expect(result.semanticSearchEnabled).toBe(true);
    expect(result.conversationHistory).toBe(true);
    expect(result.webSearch).toBe(true);
    expect(result.topicClassification).toBe(true);
    expect(result.orchestrator).toBe(true);
    expect(result.maxInputChars).toBe(3000);
    expect(result.maxOutputChars).toBe(3000);
  });

  it("会話履歴ONの用途では圧縮が自動的にONになる", () => {
    const input: SimpleModeInput = {
      modelId: 1, dailyRequests: 100,
      inputLengthPreset: "medium", outputLengthPreset: "medium",
      customInputChars: null, customOutputChars: null,
      useCaseType: "customerSupport", // 会話履歴ON
    };
    const result = convertSimpleToDetailed(input);
    expect(result.conversationHistory).toBe(true);
    expect(result.historyCompression).toBe(true);
    expect(result.compressionFrequency).toBeGreaterThan(0);
  });

  it("会話履歴OFFの用途では圧縮もOFFになる", () => {
    const input: SimpleModeInput = {
      modelId: 1, dailyRequests: 100,
      inputLengthPreset: "medium", outputLengthPreset: "medium",
      customInputChars: null, customOutputChars: null,
      useCaseType: "simpleQA", // 会話履歴OFF
    };
    const result = convertSimpleToDetailed(input);
    expect(result.conversationHistory).toBe(false);
    expect(result.historyCompression).toBe(false);
    expect(result.compressionFrequency).toBe(0);
  });

  it("会話履歴ONの用途で圧縮コストが計上される（補助モデル指定時）", () => {
    const input: SimpleModeInput = {
      modelId: 10, dailyRequests: 100,
      inputLengthPreset: "medium", outputLengthPreset: "medium",
      customInputChars: null, customOutputChars: null,
      useCaseType: "generalAssistant",
    };
    const auxModelId = 11;
    const result = convertSimpleToDetailed(input, auxModelId);
    expect(result.historyCompression).toBe(true);
    expect(result.compressionFrequency).toBeGreaterThan(0);
    expect(result.compressionModelId).toBe(auxModelId);

    // 実際にcalcRequestCostに渡した際に圧縮コストが計上されることを確認
    const requestResult = calcRequestCost({
      mainModel: mockGpt52,
      language: "ja",
      systemPromptChars: 2000,
      maxInputChars: 1000, maxOutputChars: 1500,
      avgTurnsPerSession: 5,
      topicClassification: false, classificationFallbackRate: 0, classificationModel: null,
      orchestrator: false, orchestratorModel: null,
      subAgentMaxCalls: 0, subAgentModel: null,
      semanticSearchEnabled: false, searchChunkCount: 0, searchChunkSize: 0,
      embeddingModel: null, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: true,
      maxHistoryTurns: result.maxHistoryTurns,
      historyCompression: result.historyCompression,
      compressionFrequency: result.compressionFrequency,
      compressionModel: mockGpt41Mini,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0,
      webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
      promptCaching: false,
    });

    const compressionStep = requestResult.steps.find(s => s.name === "会話履歴圧縮");
    expect(compressionStep).toBeDefined();
    expect(compressionStep!.costUsd).toBeGreaterThan(0);
    expect(compressionStep!.modelName).toBe("GPT-4.1 mini");
  });

  it("auxiliaryModelId未指定時は各ステップモデルIDがnull", () => {
    const input: SimpleModeInput = {
      modelId: 1, dailyRequests: 100,
      inputLengthPreset: "medium", outputLengthPreset: "medium",
      customInputChars: null, customOutputChars: null,
      useCaseType: "generalAssistant",
    };
    const result = convertSimpleToDetailed(input);
    expect(result.auxiliaryModelId).toBeNull();
    expect(result.classificationModelId).toBeNull();
    expect(result.orchestratorModelId).toBeNull();
    expect(result.subAgentModelId).toBeNull();
    expect(result.rerankingModelId).toBeNull();
    expect(result.compressionModelId).toBeNull();
    expect(result.summarizationModelId).toBeNull();
  });

  it("auxiliaryModelId指定時は各ステップモデルIDに補助モデルIDが設定される", () => {
    const input: SimpleModeInput = {
      modelId: 10, dailyRequests: 100,
      inputLengthPreset: "medium", outputLengthPreset: "medium",
      customInputChars: null, customOutputChars: null,
      useCaseType: "generalAssistant",
    };
    const auxModelId = 11; // GPT-4.1 mini
    const result = convertSimpleToDetailed(input, auxModelId);
    expect(result.auxiliaryModelId).toBe(auxModelId);
    expect(result.mainModelId).toBe(10);
    // 各ステップに補助モデルIDが設定される
    expect(result.classificationModelId).toBe(auxModelId);
    expect(result.orchestratorModelId).toBe(auxModelId);
    expect(result.subAgentModelId).toBe(auxModelId);
    expect(result.rerankingModelId).toBe(auxModelId);
    expect(result.compressionModelId).toBe(auxModelId);
    expect(result.summarizationModelId).toBe(auxModelId);
  });
});

// =============================================
// 13b. calcRequestCost with mixed models (補助モデル使い分け)
// =============================================
describe("calcRequestCost with mixed models", () => {
  it("メインモデルと異なる補助モデルが各ステップに渡された場合、コストが異なる", () => {
    const baseInput = {
      mainModel: mockModel, // GPT-4.1 ($2/$8)
      language: "ja" as const,
      systemPromptChars: 2000,
      maxInputChars: 1000,
      maxOutputChars: 1500,
      avgTurnsPerSession: 5,
      topicClassification: true,
      classificationFallbackRate: 20,
      orchestrator: true,
      subAgentMaxCalls: 2,
      semanticSearchEnabled: true,
      searchChunkCount: 5,
      searchChunkSize: 500,
      embeddingModel: mockEmbedding,
      rerankingEnabled: true,
      reembeddingMonthlyChars: 0,
      conversationHistory: true,
      maxHistoryTurns: 10,
      historyCompression: true,
      compressionFrequency: 3,
      webSearch: false,
      webSearchTool: null,
      webSearchCallsPerRequest: 0,
      webSearchResultCount: 0,
      webSearchSummarization: false,
      summarizationModel: null,
      promptCaching: false,
    };

    // 全ステップにメインモデルを使用
    const allMain = calcRequestCost({
      ...baseInput,
      classificationModel: mockModel,
      orchestratorModel: mockModel,
      subAgentModel: mockModel,
      rerankingModel: mockModel,
      compressionModel: mockModel,
    });

    // 補助ステップに軽量モデルを使用
    const withAux = calcRequestCost({
      ...baseInput,
      classificationModel: mockLightModel,
      orchestratorModel: mockLightModel,
      subAgentModel: mockLightModel,
      rerankingModel: mockLightModel,
      compressionModel: mockLightModel,
    });

    // 軽量モデルを使う方がコストが低い
    expect(withAux.costPerRequest).toBeLessThan(allMain.costPerRequest);
  });

  it("各ステップのmodelNameが正しく設定される", () => {
    const result = calcRequestCost({
      mainModel: mockModel,
      language: "ja",
      systemPromptChars: 2000,
      maxInputChars: 1000,
      maxOutputChars: 1500,
      avgTurnsPerSession: 1,
      topicClassification: true,
      classificationFallbackRate: 20,
      classificationModel: mockLightModel,
      orchestrator: true,
      orchestratorModel: mockLightModel,
      subAgentMaxCalls: 2,
      subAgentModel: mockModel,
      semanticSearchEnabled: false, searchChunkCount: 0, searchChunkSize: 0,
      embeddingModel: null, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: false, maxHistoryTurns: 0,
      historyCompression: false, compressionFrequency: 0, compressionModel: null,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0,
      webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
      promptCaching: false,
    });

    const mainStep = result.steps.find(s => s.name === "メインエージェント応答");
    expect(mainStep?.modelName).toBe("GPT-4.1");

    const orchestratorStep = result.steps.find(s => s.name === "オーケストレータ");
    expect(orchestratorStep?.modelName).toBe("GPT-4.1 nano");

    const subAgentStep = result.steps.find(s => s.name === "サブエージェント");
    expect(subAgentStep?.modelName).toBe("GPT-4.1");
  });
});

// =============================================
// 14. 上限値保証テスト
// =============================================
describe("上限値保証", () => {
  it("Prompt Caching ONはOFF以下のコスト", () => {
    const base = {
      mainModel: mockModel, language: "ja" as const, systemPromptChars: 2000,
      maxInputChars: 1000, maxOutputChars: 1500, avgTurnsPerSession: 1,
      topicClassification: false, classificationFallbackRate: 0, classificationModel: null,
      orchestrator: false, orchestratorModel: null,
      subAgentMaxCalls: 0, subAgentModel: null,
      semanticSearchEnabled: false, searchChunkCount: 0, searchChunkSize: 0, embeddingModel: null, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: false, maxHistoryTurns: 0, historyCompression: false, compressionFrequency: 0, compressionModel: null,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0, webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
    };
    const off = calcRequestCost({ ...base, promptCaching: false });
    const on = calcRequestCost({ ...base, promptCaching: true });
    expect(on.costPerRequest).toBeLessThanOrEqual(off.costPerRequest);
  });

  it("会話履歴ターン数増加でコスト単調増加", () => {
    const base = {
      mainModel: mockModel, language: "ja" as const, systemPromptChars: 2000,
      maxInputChars: 1000, maxOutputChars: 1500, avgTurnsPerSession: 5,
      topicClassification: false, classificationFallbackRate: 0, classificationModel: null,
      orchestrator: false, orchestratorModel: null,
      subAgentMaxCalls: 0, subAgentModel: null,
      semanticSearchEnabled: false, searchChunkCount: 0, searchChunkSize: 0, embeddingModel: null, rerankingEnabled: false, rerankingModel: null, reembeddingMonthlyChars: 0,
      conversationHistory: true, historyCompression: false, compressionFrequency: 0, compressionModel: null,
      webSearch: false, webSearchTool: null, webSearchCallsPerRequest: 0, webSearchResultCount: 0, webSearchSummarization: false, summarizationModel: null,
      promptCaching: false,
    };
    const r5 = calcRequestCost({ ...base, maxHistoryTurns: 5 });
    const r10 = calcRequestCost({ ...base, maxHistoryTurns: 10 });
    const r20 = calcRequestCost({ ...base, maxHistoryTurns: 20 });
    expect(r10.costPerRequest).toBeGreaterThan(r5.costPerRequest);
    expect(r20.costPerRequest).toBeGreaterThan(r10.costPerRequest);
  });

  it("安全マージン増加でコスト単調増加", () => {
    const r0 = calcMonthlyCost(1.0, 100, 20, 0, 150);
    const r20 = calcMonthlyCost(1.0, 100, 20, 20, 150);
    const r50 = calcMonthlyCost(1.0, 100, 20, 50, 150);
    expect(r20.monthlyCostUsd).toBeGreaterThan(r0.monthlyCostUsd);
    expect(r50.monthlyCostUsd).toBeGreaterThan(r20.monthlyCostUsd);
  });
});

// =============================================
// 15. MODEL_PAIRINGS 定数
// =============================================
describe("MODEL_PAIRINGS", () => {
  it("全メインモデル（非lightweight・非legacy）がペアリング表にカバーされている", () => {
    const mainModelNames = [
      // OpenAI
      "GPT-5.2", "GPT-5.2 pro", "GPT-5 mini",
      "GPT-4.1", "GPT-4.1 mini", "GPT-4o",
      "o4-mini", "o3-mini",
      // Anthropic
      "Claude Opus 4.6", "Claude Sonnet 4.5",
      // Google
      "Gemini 3 Pro Preview", "Gemini 3 Flash Preview",
      "Gemini 2.5 Pro", "Gemini 2.5 Flash", "Gemini 2.0 Flash",
    ];
    for (const name of mainModelNames) {
      expect(MODEL_PAIRINGS).toHaveProperty(name);
      expect(MODEL_PAIRINGS[name]).toBeTruthy();
    }
  });

  it("lightweight モデルはペアリング表のキーに含まれない", () => {
    const lightweightNames = [
      "GPT-4.1 nano", "GPT-4o-mini",
      "Claude Haiku 4.5",
      "Gemini 2.5 Flash Lite", "Gemini 2.0 Flash Lite",
    ];
    for (const name of lightweightNames) {
      expect(MODEL_PAIRINGS).not.toHaveProperty(name);
    }
  });

  it("ペアリングのメインと補助が同じモデル名ではない", () => {
    for (const [main, aux] of Object.entries(MODEL_PAIRINGS)) {
      expect(main).not.toBe(aux);
    }
  });
});

// =============================================
// 16. getRecommendedAuxiliary
// =============================================
describe("getRecommendedAuxiliary", () => {
  it("GPT-5.2のメインモデルに対してGPT-4.1 miniが返される", () => {
    const aux = getRecommendedAuxiliary(mockGpt52, allMockModels);
    expect(aux).not.toBeNull();
    expect(aux!.name).toBe("GPT-4.1 mini");
  });

  it("Claude Opus 4.6のメインモデルに対してClaude Haiku 4.5が返される", () => {
    const aux = getRecommendedAuxiliary(mockClaudeOpus46, allMockModels);
    expect(aux).not.toBeNull();
    expect(aux!.name).toBe("Claude Haiku 4.5");
  });

  it("Gemini 3 Pro Previewに対してGemini 3 Flash Previewが返される", () => {
    const aux = getRecommendedAuxiliary(mockGemini3Pro, allMockModels);
    expect(aux).not.toBeNull();
    expect(aux!.name).toBe("Gemini 3 Flash Preview");
  });

  it("ペアリング表に存在しないモデル名の場合はnullを返す", () => {
    const unknownModel: Model = {
      id: 99, providerId: 99, providerName: "Unknown", name: "Unknown Model",
      category: "standard", inputPrice: 1.0, outputPrice: 2.0,
      cacheWritePrice: null, cacheReadPrice: null,
      maxContextLength: null, isLegacy: false, ...nullBenchmarks,
    };
    const aux = getRecommendedAuxiliary(unknownModel, allMockModels);
    expect(aux).toBeNull();
  });

  it("補助モデルがレガシーのみの場合はnullを返す", () => {
    // allMockModels から Claude Haiku 4.5 (非レガシー) を除外し、レガシー版のみにする
    const modelsWithOnlyLegacyHaiku = allMockModels
      .filter(m => m.id !== mockClaudeHaiku45.id)
      .concat(mockClaudeHaiku45Legacy);
    const aux = getRecommendedAuxiliary(mockClaudeOpus46, modelsWithOnlyLegacyHaiku);
    expect(aux).toBeNull();
  });

  it("lightweightモデル自体を渡した場合はnullを返す", () => {
    const aux = getRecommendedAuxiliary(mockLightModel, allMockModels);
    expect(aux).toBeNull();
  });
});

// =============================================
// 17. isMainModelEligible
// =============================================
describe("isMainModelEligible", () => {
  it("flagshipモデルはメインモデルとして適格", () => {
    expect(isMainModelEligible(mockGpt52)).toBe(true);
    expect(isMainModelEligible(mockClaudeOpus46)).toBe(true);
    expect(isMainModelEligible(mockGemini3Pro)).toBe(true);
  });

  it("standardモデルはメインモデルとして適格", () => {
    expect(isMainModelEligible(mockModel)).toBe(true); // GPT-4.1
    expect(isMainModelEligible(mockAnthropicModel)).toBe(true); // Claude Sonnet 4.5
    expect(isMainModelEligible(mockGemini3Flash)).toBe(true);
  });

  it("lightweightモデルはメインモデルとして不適格", () => {
    expect(isMainModelEligible(mockLightModel)).toBe(false); // GPT-4.1 nano
    expect(isMainModelEligible(mockClaudeHaiku45)).toBe(false);
    expect(isMainModelEligible(mockGpt4oMini)).toBe(false);
  });

  it("reasoningモデルはメインモデルとして適格", () => {
    const o4Mini: Model = {
      id: 40, providerId: 1, providerName: "OpenAI", name: "o4-mini",
      category: "reasoning", inputPrice: 1.1, outputPrice: 4.4,
      cacheWritePrice: null, cacheReadPrice: null,
      maxContextLength: null, isLegacy: false, ...nullBenchmarks,
    };
    expect(isMainModelEligible(o4Mini)).toBe(true);
  });
});

// =============================================
// 18. StepCost.description フィールド
// =============================================
describe("StepCost description", () => {
  it("トピック分類: フォールバック率がdescriptionに含まれる", () => {
    const result = calcTopicClassificationCost(true, 20, mockLightModel, mockEmbedding, "ja", 1000);
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("20%");
  });

  it("トピック分類: 無効時もdescriptionが空でない", () => {
    const result = calcTopicClassificationCost(false, 0, null, null, "ja", 1000);
    expect(typeof result.description).toBe("string");
  });

  it("オーケストレータ: 有効時にdescriptionが空でない", () => {
    const result = calcOrchestratorCost(true, mockLightModel, "ja", 1000, 500);
    expect(result.description).toBeTruthy();
  });

  it("意味検索: チャンク数がdescriptionに含まれる", () => {
    const result = calcSemanticSearchCost(true, 5, 500, mockEmbedding, false, null, "ja", 1000);
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("5");
  });

  it("意味検索: リランキング有効時にその旨がdescriptionに含まれる", () => {
    const result = calcSemanticSearchCost(true, 5, 500, mockEmbedding, true, mockLightModel, "ja", 1000);
    expect(result.description).toContain("リランキング");
  });

  it("再埋め込み: 有効時にdescriptionが空でない", () => {
    const result = calcReembeddingCost(1_000_000, mockEmbedding, "ja");
    expect(result.description).toBeTruthy();
  });

  it("Web参照: 検索回数と結果件数がdescriptionに含まれる", () => {
    const result = calcWebSearchCost(true, mockWebSearch, 2, 5, false, null, "ja");
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("2");
    expect(result.description).toContain("5");
  });

  it("会話履歴参照: ターン数がdescriptionに含まれる", () => {
    const result = calcConversationHistoryCost(true, 10, "ja", 1000, 1500);
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("10");
  });

  it("メインエージェント応答: descriptionが空でない", () => {
    const result = calcMainAgentCost(mockModel, "ja", 2000, 1000, 1500, 0, 0, 0, false);
    expect(result.description).toBeTruthy();
  });

  it("メインエージェント応答: Prompt Caching ONの場合にその旨がdescriptionに含まれる", () => {
    const result = calcMainAgentCost(mockModel, "ja", 2000, 1000, 1500, 0, 0, 0, true);
    expect(result.description).toContain("Prompt Caching");
  });

  it("サブエージェント: 呼び出し回数がdescriptionに含まれる", () => {
    const result = calcSubAgentCost(3, mockLightModel, "ja", 1000, 500);
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("3");
  });

  it("会話履歴圧縮: 圧縮頻度がdescriptionに含まれる", () => {
    const result = calcCompressionCost(true, 5, mockLightModel, "ja", 1000, 1500, 10);
    expect(result.description).toBeTruthy();
    expect(result.description).toContain("5");
  });
});
