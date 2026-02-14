import { describe, it, expect } from "vitest";
import {
  TOKEN_CONVERSION_RATES,
  SIMPLE_MODE_DEFAULTS,
  USE_CASE_PRESETS,
  INPUT_LENGTH_PRESETS,
  OUTPUT_LENGTH_PRESETS,
  ALL_ESTIMATION_MAPPINGS,
  ESTIMATION_BASE_CHARS,
} from "../defaults";

describe("TOKEN_CONVERSION_RATES", () => {
  it("日本語は1.5トークン/文字", () => {
    expect(TOKEN_CONVERSION_RATES.ja).toBe(1.5);
  });
  it("英語は0.25トークン/文字", () => {
    expect(TOKEN_CONVERSION_RATES.en).toBe(0.25);
  });
  it("混在は0.7トークン/文字", () => {
    expect(TOKEN_CONVERSION_RATES.mixed).toBe(0.7);
  });
});

describe("SIMPLE_MODE_DEFAULTS", () => {
  it("全14項目が定義されている", () => {
    expect(SIMPLE_MODE_DEFAULTS.language).toBe("ja");
    expect(SIMPLE_MODE_DEFAULTS.monthlyWorkingDays).toBe(20);
    expect(SIMPLE_MODE_DEFAULTS.systemPromptChars).toBe(2000);
    expect(SIMPLE_MODE_DEFAULTS.avgTurnsPerSession).toBe(5);
    expect(SIMPLE_MODE_DEFAULTS.searchChunkCount).toBe(5);
    expect(SIMPLE_MODE_DEFAULTS.searchChunkSize).toBe(500);
    expect(SIMPLE_MODE_DEFAULTS.reembeddingMonthlyChars).toBe(0);
    expect(SIMPLE_MODE_DEFAULTS.maxHistoryTurns).toBe(10);
    expect(SIMPLE_MODE_DEFAULTS.historyCompression).toBe(false);
    expect(SIMPLE_MODE_DEFAULTS.webSearchResultCount).toBe(3);
    expect(SIMPLE_MODE_DEFAULTS.classificationFallbackRate).toBe(20);
    expect(SIMPLE_MODE_DEFAULTS.subAgentMaxCalls).toBe(2);
    expect(SIMPLE_MODE_DEFAULTS.promptCaching).toBe(false);
    expect(SIMPLE_MODE_DEFAULTS.safetyMargin).toBe(20);
    expect(SIMPLE_MODE_DEFAULTS.exchangeRate).toBe(150);
  });
});

describe("USE_CASE_PRESETS", () => {
  it("シンプルQ&A: 全OFF", () => {
    const p = USE_CASE_PRESETS.simpleQA;
    expect(p.semanticSearchEnabled).toBe(false);
    expect(p.conversationHistory).toBe(false);
    expect(p.webSearch).toBe(false);
    expect(p.topicClassification).toBe(false);
    expect(p.orchestrator).toBe(false);
  });

  it("社内ナレッジ検索: 意味検索のみON", () => {
    const p = USE_CASE_PRESETS.knowledgeSearch;
    expect(p.semanticSearchEnabled).toBe(true);
    expect(p.conversationHistory).toBe(false);
    expect(p.webSearch).toBe(false);
    expect(p.topicClassification).toBe(false);
    expect(p.orchestrator).toBe(false);
  });

  it("カスタマーサポート: 意味検索+履歴+分類+オーケストレータON", () => {
    const p = USE_CASE_PRESETS.customerSupport;
    expect(p.semanticSearchEnabled).toBe(true);
    expect(p.conversationHistory).toBe(true);
    expect(p.webSearch).toBe(false);
    expect(p.topicClassification).toBe(true);
    expect(p.orchestrator).toBe(true);
  });

  it("汎用AIアシスタント: 全ON", () => {
    const p = USE_CASE_PRESETS.generalAssistant;
    expect(p.semanticSearchEnabled).toBe(true);
    expect(p.conversationHistory).toBe(true);
    expect(p.webSearch).toBe(true);
    expect(p.topicClassification).toBe(true);
    expect(p.orchestrator).toBe(true);
  });
});

describe("INPUT_LENGTH_PRESETS / OUTPUT_LENGTH_PRESETS", () => {
  it("入力: 短文200/中文1000/長文3000", () => {
    expect(INPUT_LENGTH_PRESETS.short).toBe(200);
    expect(INPUT_LENGTH_PRESETS.medium).toBe(1000);
    expect(INPUT_LENGTH_PRESETS.long).toBe(3000);
  });

  it("出力: 短文500/中文1500/長文3000", () => {
    expect(OUTPUT_LENGTH_PRESETS.short).toBe(500);
    expect(OUTPUT_LENGTH_PRESETS.medium).toBe(1500);
    expect(OUTPUT_LENGTH_PRESETS.long).toBe(3000);
  });
});

describe("推定ヘルパー定数", () => {
  it("全20要素のマッピングが定義されている", () => {
    expect(Object.keys(ALL_ESTIMATION_MAPPINGS)).toHaveLength(20);
  });

  it("ベース文字数は200", () => {
    expect(ESTIMATION_BASE_CHARS).toBe(200);
  });

  it("各要素にnone/low/medium/highの4レベルが存在する", () => {
    for (const [key, mapping] of Object.entries(ALL_ESTIMATION_MAPPINGS)) {
      expect(mapping).toHaveProperty("none");
      expect(mapping).toHaveProperty("low");
      expect(mapping).toHaveProperty("medium");
      expect(mapping).toHaveProperty("high");
      expect(mapping.none).toBe(0);
      expect(mapping.high).toBeGreaterThan(0);
    }
  });

  it("全要素で none < low < medium < high の単調増加になっている", () => {
    for (const [key, mapping] of Object.entries(ALL_ESTIMATION_MAPPINGS)) {
      expect(mapping.none).toBeLessThan(mapping.low);
      expect(mapping.low).toBeLessThan(mapping.medium);
      expect(mapping.medium).toBeLessThan(mapping.high);
    }
  });

  it("各要素のmedium値が正しい中間値に設定されている", () => {
    const m = ALL_ESTIMATION_MAPPINGS;
    // A: 行動制約・ガードレール系
    expect(m.a1Guardrails.medium).toBe(600);
    expect(m.a2Compliance.medium).toBe(600);
    expect(m.a3ProhibitedTopics.medium).toBe(300);
    expect(m.a4PriorityRules.medium).toBe(250);
    expect(m.a5ErrorHandling.medium).toBe(400);
    // B: ナレッジ・ドメイン系
    expect(m.b1DomainKnowledge.medium).toBe(1000);
    expect(m.b2FewShotExamples.medium).toBe(1000);
    expect(m.b3WorkflowDefinition.medium).toBe(800);
    // C: 入出力制御系
    expect(m.c1OutputFormat.medium).toBe(400);
    expect(m.c2PersonaTone.medium).toBe(250);
    expect(m.c3ResponseLength.medium).toBe(100);
    expect(m.c4CitationRules.medium).toBe(200);
    expect(m.c5MultiLanguage.medium).toBe(400);
    // D: ツール・外部連携系
    expect(m.d1ToolDefinitions.medium).toBe(1500);
    expect(m.d2ReferenceInstructions.medium).toBe(500);
    expect(m.d3ApiIntegration.medium).toBe(600);
    // E: コンテキスト・セッション系
    expect(m.e1UserSegments.medium).toBe(600);
    expect(m.e2DynamicContext.medium).toBe(300);
    expect(m.e3MultiStepReasoning.medium).toBe(500);
    expect(m.e4ExceptionHandling.medium).toBe(500);
  });
});
